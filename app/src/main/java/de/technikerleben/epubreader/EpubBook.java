package de.technikerleben.epubreader;

import android.content.Context;
import android.net.Uri;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import javax.xml.parsers.DocumentBuilderFactory;

final class EpubBook {
    static final class Chapter {
        final String title;
        final File file;

        Chapter(String title, File file) {
            this.title = title;
            this.file = file;
        }
    }

    final String title;
    final List<Chapter> chapters;

    private EpubBook(String title, List<Chapter> chapters) {
        this.title = title;
        this.chapters = chapters;
    }

    static EpubBook open(Context context, Uri uri) throws Exception {
        File root = new File(context.getCacheDir(), "books/" + Integer.toHexString(uri.toString().hashCode()));
        deleteTree(root);
        if (!root.mkdirs()) throw new IllegalStateException("Temporärer Buchordner konnte nicht erstellt werden.");

        try (InputStream input = context.getContentResolver().openInputStream(uri);
             ZipInputStream zip = new ZipInputStream(input)) {
            if (input == null) throw new IllegalArgumentException("Die Datei konnte nicht geöffnet werden.");
            ZipEntry entry;
            byte[] buffer = new byte[32 * 1024];
            String rootPath = root.getCanonicalPath() + File.separator;
            while ((entry = zip.getNextEntry()) != null) {
                File target = new File(root, entry.getName());
                if (!target.getCanonicalPath().startsWith(rootPath)) {
                    throw new SecurityException("Ungültiger Dateipfad im EPUB.");
                }
                if (entry.isDirectory()) {
                    target.mkdirs();
                } else {
                    File parent = target.getParentFile();
                    if (parent != null) parent.mkdirs();
                    try (FileOutputStream output = new FileOutputStream(target)) {
                        int read;
                        while ((read = zip.read(buffer)) != -1) output.write(buffer, 0, read);
                    }
                }
                zip.closeEntry();
            }
        }

        Document container = parseXml(new File(root, "META-INF/container.xml"));
        Element rootFile = first(container, "rootfile");
        if (rootFile == null) throw new IllegalArgumentException("Kein EPUB-Inhalt gefunden.");
        File opf = new File(root, rootFile.getAttribute("full-path"));
        Document packageDoc = parseXml(opf);
        File contentDir = opf.getParentFile();

        String bookTitle = textOfFirst(packageDoc, "title");
        if (bookTitle == null || bookTitle.trim().isEmpty()) bookTitle = "Unbenanntes Buch";

        Map<String, String> hrefById = new LinkedHashMap<>();
        Map<String, String> mediaById = new HashMap<>();
        String navHref = null;
        String ncxHref = null;
        NodeList items = packageDoc.getElementsByTagNameNS("*", "item");
        for (int i = 0; i < items.getLength(); i++) {
            Element item = (Element) items.item(i);
            String id = item.getAttribute("id");
            String href = item.getAttribute("href");
            String media = item.getAttribute("media-type");
            hrefById.put(id, href);
            mediaById.put(id, media);
            if (item.getAttribute("properties").contains("nav")) navHref = href;
            if ("application/x-dtbncx+xml".equals(media)) ncxHref = href;
        }

        Map<String, String> titles = new HashMap<>();
        if (navHref != null) readNavTitles(new File(contentDir, cleanHref(navHref)), contentDir, titles);
        if (titles.isEmpty() && ncxHref != null) readNcxTitles(new File(contentDir, cleanHref(ncxHref)), contentDir, titles);

        List<Chapter> chapters = new ArrayList<>();
        NodeList refs = packageDoc.getElementsByTagNameNS("*", "itemref");
        for (int i = 0; i < refs.getLength(); i++) {
            Element ref = (Element) refs.item(i);
            String id = ref.getAttribute("idref");
            String href = hrefById.get(id);
            String media = mediaById.get(id);
            if (href == null || !("application/xhtml+xml".equals(media) || "text/html".equals(media))) continue;
            File chapterFile = new File(contentDir, cleanHref(href));
            String key = canonicalRelative(contentDir, chapterFile);
            String chapterTitle = titles.get(key);
            if (chapterTitle == null || chapterTitle.isEmpty()) chapterTitle = "Abschnitt " + (chapters.size() + 1);
            chapters.add(new Chapter(chapterTitle, chapterFile));
        }
        if (chapters.isEmpty()) throw new IllegalArgumentException("Das EPUB enthält keine lesbaren Kapitel.");
        return new EpubBook(bookTitle.trim(), chapters);
    }

    private static void readNavTitles(File nav, File contentDir, Map<String, String> titles) {
        try {
            Document doc = parseXml(nav);
            NodeList anchors = doc.getElementsByTagNameNS("*", "a");
            for (int i = 0; i < anchors.getLength(); i++) {
                Element a = (Element) anchors.item(i);
                String href = a.getAttribute("href");
                if (href.isEmpty()) continue;
                File file = new File(nav.getParentFile(), cleanHref(href));
                titles.put(canonicalRelative(contentDir, file), a.getTextContent().trim());
            }
        } catch (Exception ignored) { }
    }

    private static void readNcxTitles(File ncx, File contentDir, Map<String, String> titles) {
        try {
            Document doc = parseXml(ncx);
            NodeList points = doc.getElementsByTagNameNS("*", "navPoint");
            for (int i = 0; i < points.getLength(); i++) {
                Element point = (Element) points.item(i);
                Element content = child(point, "content");
                Element label = child(point, "navLabel");
                if (content == null || label == null) continue;
                File file = new File(ncx.getParentFile(), cleanHref(content.getAttribute("src")));
                titles.put(canonicalRelative(contentDir, file), label.getTextContent().trim());
            }
        } catch (Exception ignored) { }
    }

    String html(int index, ReaderPreferences preferences) throws Exception {
        String source = new String(Files.readAllBytes(chapters.get(index).file.toPath()), StandardCharsets.UTF_8);
        source = source.replaceAll("(?is)<script\\b[^>]*>.*?</script>", "")
                .replaceAll("(?is)<iframe\\b[^>]*>.*?</iframe>", "")
                .replaceAll("(?i)\\son[a-z]+\\s*=\\s*(['\"]).*?\\1", "");
        String css = "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
                "<style>html,body{background:" + preferences.background + "!important;color:" + preferences.foreground +
                "!important}body{font-family:" + preferences.fontFamily + "!important;font-size:" + preferences.fontSize +
                "px!important;line-height:" + preferences.lineHeight + "!important;margin:" + preferences.margin +
                "px!important;overflow-wrap:anywhere}p{margin:.65em 0}img,svg,video{max-width:100%!important;height:auto!important}" +
                "table{max-width:100%!important;display:block;overflow-x:auto}a{color:" + preferences.link +
                "!important}pre{white-space:pre-wrap}body>*:first-child{margin-top:0}</style>";
        int head = source.toLowerCase().indexOf("</head>");
        if (head >= 0) return source.substring(0, head) + css + source.substring(head);
        int body = source.toLowerCase().indexOf("<body");
        if (body >= 0) return source.substring(0, body) + "<head>" + css + "</head>" + source.substring(body);
        return "<!doctype html><html><head>" + css + "</head><body>" + source + "</body></html>";
    }

    private static Document parseXml(File file) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        try (FileInputStream input = new FileInputStream(file)) {
            return factory.newDocumentBuilder().parse(input);
        }
    }

    private static Element first(Document doc, String localName) {
        NodeList list = doc.getElementsByTagNameNS("*", localName);
        return list.getLength() == 0 ? null : (Element) list.item(0);
    }

    private static String textOfFirst(Document doc, String localName) {
        Element element = first(doc, localName);
        return element == null ? null : element.getTextContent();
    }

    private static Element child(Element parent, String localName) {
        NodeList children = parent.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node node = children.item(i);
            if (node instanceof Element && localName.equals(node.getLocalName())) return (Element) node;
        }
        return null;
    }

    private static String cleanHref(String href) {
        int hash = href.indexOf('#');
        if (hash >= 0) href = href.substring(0, hash);
        int query = href.indexOf('?');
        if (query >= 0) href = href.substring(0, query);
        return Uri.decode(href);
    }

    private static String canonicalRelative(File root, File file) throws Exception {
        return root.toPath().toRealPath().relativize(file.toPath().toRealPath()).toString().replace(File.separatorChar, '/');
    }

    private static void deleteTree(File file) {
        if (!file.exists()) return;
        File[] children = file.listFiles();
        if (children != null) for (File child : children) deleteTree(child);
        file.delete();
    }
}
