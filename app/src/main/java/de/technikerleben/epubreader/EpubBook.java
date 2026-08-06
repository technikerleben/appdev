package de.technikerleben.epubreader;

import android.content.Context;
import android.net.Uri;
import android.text.Html;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;

final class EpubBook {
    static final class SearchResult {
        final int chapter;
        final String chapterTitle;
        final String snippet;

        SearchResult(int chapter, String chapterTitle, String snippet) {
            this.chapter = chapter;
            this.chapterTitle = chapterTitle;
            this.snippet = snippet;
        }
    }
    static final class Chapter {
        final String title;
        final File file;
        final int depth;

        Chapter(String title, File file, int depth) {
            this.title = title;
            this.file = file;
            this.depth = depth;
        }
    }

    final String title;
    final String author;
    final File cover;
    final List<Chapter> chapters;

    private EpubBook(String title, String author, File cover, List<Chapter> chapters) {
        this.title = title;
        this.author = author;
        this.cover = cover;
        this.chapters = chapters;
    }

    static EpubBook open(Context context, Uri uri) throws Exception {
        File root = new File(context.getCacheDir(), "books/" + Integer.toHexString(uri.toString().hashCode()));
        cleanupBookCache(root.getParentFile(), root);
        deleteTree(root);
        if (!root.mkdirs()) throw new IllegalStateException(context.getString(R.string.book_cache_failed));

        InputStream source = context.getContentResolver().openInputStream(uri);
        if (source == null) throw new IllegalArgumentException(context.getString(R.string.file_access_denied));
        int extractedFiles = 0;
        try (InputStream input = source; ZipInputStream zip = new ZipInputStream(input)) {
            ZipEntry entry;
            byte[] buffer = new byte[32 * 1024];
            String rootPath = root.getCanonicalPath() + File.separator;
            while ((entry = zip.getNextEntry()) != null) {
                File target = new File(root, entry.getName());
                if (!target.getCanonicalPath().startsWith(rootPath)) {
                    throw new SecurityException(context.getString(R.string.invalid_epub_path));
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
                    extractedFiles++;
                }
                zip.closeEntry();
            }
        }

        if (extractedFiles == 0) {
            throw new IllegalArgumentException(context.getString(R.string.invalid_epub_archive));
        }
        root.setLastModified(System.currentTimeMillis());
        cleanupBookCache(root.getParentFile(), root);

        File containerFile = findIgnoreCase(root, "META-INF/container.xml");
        if (containerFile == null) {
            throw new IllegalArgumentException(context.getString(R.string.missing_container));
        }
        Document container = parseXml(containerFile);
        Element rootFile = first(container, "rootfile");
        if (rootFile == null) throw new IllegalArgumentException(context.getString(R.string.missing_content));
        File opf = new File(root, Uri.decode(rootFile.getAttribute("full-path")));
        if (!opf.isFile()) throw new IllegalArgumentException(context.getString(R.string.missing_opf));
        Document packageDoc = parseXml(opf);
        File contentDir = opf.getParentFile();

        String bookTitle = textOfFirst(packageDoc, "title");
        if (bookTitle == null || bookTitle.trim().isEmpty()) bookTitle = context.getString(R.string.untitled_book);
        String bookAuthor = textOfFirst(packageDoc, "creator");
        if (bookAuthor == null) bookAuthor = "";

        String coverId = null;
        NodeList metas = packageDoc.getElementsByTagNameNS("*", "meta");
        for (int i = 0; i < metas.getLength(); i++) {
            Element meta = (Element) metas.item(i);
            if ("cover".equalsIgnoreCase(meta.getAttribute("name"))) coverId = meta.getAttribute("content");
        }

        Map<String, String> hrefById = new LinkedHashMap<>();
        Map<String, String> mediaById = new HashMap<>();
        String navHref = null;
        String ncxHref = null;
        String coverHref = null;
        NodeList items = packageDoc.getElementsByTagNameNS("*", "item");
        for (int i = 0; i < items.getLength(); i++) {
            Element item = (Element) items.item(i);
            String id = item.getAttribute("id");
            String href = item.getAttribute("href");
            String media = item.getAttribute("media-type");
            hrefById.put(id, href);
            mediaById.put(id, media);
            if (item.getAttribute("properties").contains("nav")) navHref = href;
            if (item.getAttribute("properties").contains("cover-image") || id.equals(coverId)) coverHref = href;
            if ("application/x-dtbncx+xml".equals(media)) ncxHref = href;
        }

        Map<String, String> titles = new HashMap<>();
        Map<String, Integer> depths = new HashMap<>();
        if (navHref != null) readNavTitles(new File(contentDir, hrefPath(navHref)), contentDir, titles, depths);
        if (titles.isEmpty() && ncxHref != null) readNcxTitles(new File(contentDir, hrefPath(ncxHref)), contentDir, titles, depths);

        List<Chapter> chapters = new ArrayList<>();
        NodeList refs = packageDoc.getElementsByTagNameNS("*", "itemref");
        for (int i = 0; i < refs.getLength(); i++) {
            Element ref = (Element) refs.item(i);
            String id = ref.getAttribute("idref");
            String href = hrefById.get(id);
            String media = mediaById.get(id);
            if (href == null || !("application/xhtml+xml".equals(media) || "text/html".equals(media))) continue;
            File chapterFile = new File(contentDir, hrefPath(href));
            String key = canonicalRelative(contentDir, chapterFile);
            String chapterTitle = titles.get(key);
            if (chapterTitle == null || chapterTitle.isEmpty()) chapterTitle = context.getString(R.string.section_number, chapters.size() + 1);
            chapters.add(new Chapter(chapterTitle, chapterFile, depths.getOrDefault(key, 0)));
        }
        if (chapters.isEmpty()) throw new IllegalArgumentException(context.getString(R.string.no_chapters));
        File coverFile = coverHref == null ? null : new File(contentDir, hrefPath(coverHref));
        if (coverFile != null && !coverFile.isFile()) coverFile = null;
        return new EpubBook(bookTitle.trim(), bookAuthor.trim(), coverFile, chapters);
    }

    private static void readNavTitles(File nav, File contentDir, Map<String, String> titles, Map<String, Integer> depths) {
        try {
            Document doc = parseXml(nav);
            NodeList anchors = doc.getElementsByTagNameNS("*", "a");
            for (int i = 0; i < anchors.getLength(); i++) {
                Element a = (Element) anchors.item(i);
                String href = a.getAttribute("href");
                if (href.isEmpty()) continue;
                File file = new File(nav.getParentFile(), hrefPath(href));
                String key = canonicalRelative(contentDir, file);
                titles.put(key, a.getTextContent().trim());
                depths.put(key, ancestorDepth(a, "li", 1));
            }
        } catch (Exception ignored) { }
    }

    private static void readNcxTitles(File ncx, File contentDir, Map<String, String> titles, Map<String, Integer> depths) {
        try {
            Document doc = parseXml(ncx);
            NodeList points = doc.getElementsByTagNameNS("*", "navPoint");
            for (int i = 0; i < points.getLength(); i++) {
                Element point = (Element) points.item(i);
                Element content = child(point, "content");
                Element label = child(point, "navLabel");
                if (content == null || label == null) continue;
                File file = new File(ncx.getParentFile(), hrefPath(content.getAttribute("src")));
                String key = canonicalRelative(contentDir, file);
                titles.put(key, label.getTextContent().trim());
                depths.put(key, ancestorDepth(point, "navPoint", 0));
            }
        } catch (Exception ignored) { }
    }

    private static int ancestorDepth(Node node, String localName, int baseline) {
        int count = 0;
        Node parent = node.getParentNode();
        while (parent != null) {
            if (parent instanceof Element && localName.equals(((Element) parent).getLocalName())) count++;
            parent = parent.getParentNode();
        }
        return Math.max(0, count - baseline);
    }

    String html(int index, ReaderPreferences preferences) throws Exception {
        String source = decodeText(Files.readAllBytes(chapters.get(index).file.toPath()));
        source = source.replaceAll("(?is)<script\\b[^>]*>.*?</script>", "")
                .replaceAll("(?is)<iframe\\b[^>]*>.*?</iframe>", "")
                .replaceAll("(?i)\\son[a-z]+\\s*=\\s*(['\"]).*?\\1", "");
        int pageGap = preferences.margin * 2;
        int effectiveFontSize = Math.round(preferences.fontSize * preferences.systemFontScale);
        String css = "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />" +
                "<style>html{width:100%;height:100%;padding:0;margin:0;overflow-x:auto!important;overflow-y:hidden!important;" +
                "background:" + preferences.background + "!important;color:" + preferences.foreground + "!important}" +
                "body{box-sizing:border-box;width:auto!important;max-width:none!important;height:calc(100vh - " + pageGap +
                "px)!important;font-family:" + preferences.fontFamily + "!important;font-size:" + effectiveFontSize +
                "px!important;line-height:" + preferences.lineHeight + "!important;margin:" + preferences.margin +
                "px!important;padding:0!important;-webkit-column-width:calc(100vw - " + pageGap +
                "px);column-width:calc(100vw - " + pageGap + "px);-webkit-column-gap:" + pageGap +
                "px;column-gap:" + pageGap + "px;-webkit-column-fill:auto;column-fill:auto;overflow:visible!important;" +
                "overflow-wrap:anywhere}p{margin:.65em 0}h1,h2,h3,h4,figure,img,svg,video{break-inside:avoid}" +
                "img,svg,video{max-width:100%!important;max-height:calc(100vh - " + pageGap +
                "px)!important;height:auto!important}table{max-width:100%!important;font-size:.9em}a{color:" + preferences.link +
                "!important}pre{white-space:pre-wrap}body>*:first-child{margin-top:0}" +
                "@media (min-width:600px){body{-webkit-column-width:calc((100vw - " + (pageGap * 2) +
                "px)/2);column-width:calc((100vw - " + (pageGap * 2) + "px)/2)}}</style>";
        int head = source.toLowerCase().indexOf("</head>");
        if (head >= 0) return source.substring(0, head) + css + source.substring(head);
        int body = source.toLowerCase().indexOf("<body");
        if (body >= 0) return source.substring(0, body) + "<head>" + css + "</head>" + source.substring(body);
        return "<!doctype html><html><head>" + css + "</head><body>" + source + "</body></html>";
    }

    List<SearchResult> search(String query, AtomicBoolean cancelled) throws Exception {
        List<SearchResult> results = new ArrayList<>();
        String needle = query.toLowerCase(Locale.ROOT);
        for (int i = 0; i < chapters.size() && !cancelled.get(); i++) {
            String markup = decodeText(Files.readAllBytes(chapters.get(i).file.toPath()));
            String text = Html.fromHtml(markup, Html.FROM_HTML_MODE_LEGACY).toString().replaceAll("\\s+", " ").trim();
            String lower = text.toLowerCase(Locale.ROOT);
            int from = 0;
            while (!cancelled.get() && results.size() < 200) {
                int match = lower.indexOf(needle, from);
                if (match < 0) break;
                int start = Math.max(0, match - 55);
                int end = Math.min(text.length(), match + query.length() + 80);
                String snippet = (start > 0 ? "…" : "") + text.substring(start, end).trim() + (end < text.length() ? "…" : "");
                results.add(new SearchResult(i, chapters.get(i).title, snippet));
                from = match + Math.max(1, query.length());
            }
            if (results.size() >= 200) break;
        }
        return results;
    }

    private static String decodeText(byte[] data) {
        int offset = 0;
        Charset charset = StandardCharsets.UTF_8;
        if (data.length >= 3 && (data[0] & 0xff) == 0xef && (data[1] & 0xff) == 0xbb && (data[2] & 0xff) == 0xbf) {
            offset = 3;
        } else if (data.length >= 2 && (data[0] & 0xff) == 0xff && (data[1] & 0xff) == 0xfe) {
            charset = StandardCharsets.UTF_16LE;
            offset = 2;
        } else if (data.length >= 2 && (data[0] & 0xff) == 0xfe && (data[1] & 0xff) == 0xff) {
            charset = StandardCharsets.UTF_16BE;
            offset = 2;
        } else {
            String header = new String(data, 0, Math.min(data.length, 8192), StandardCharsets.ISO_8859_1);
            java.util.regex.Matcher declaration = java.util.regex.Pattern
                    .compile("(?i)<\\?xml[^>]*encoding\\s*=\\s*['\"]\\s*([^'\"\\s]+)")
                    .matcher(header);
            java.util.regex.Matcher meta = java.util.regex.Pattern
                    .compile("(?i)<meta[^>]+charset\\s*=\\s*['\"]?\\s*([^'\"\\s/>;]+)")
                    .matcher(header);
            java.util.regex.Matcher httpEquiv = java.util.regex.Pattern
                    .compile("(?i)<meta[^>]+content\\s*=\\s*['\"][^'\"]*charset\\s*=\\s*([^'\";\\s]+)")
                    .matcher(header);
            String declared = declaration.find() ? declaration.group(1) : (meta.find() ? meta.group(1) : (httpEquiv.find() ? httpEquiv.group(1) : null));
            if (declared != null) {
                try { charset = Charset.forName(declared.trim()); }
                catch (Exception ignored) { charset = StandardCharsets.UTF_8; }
            }
        }
        return new String(data, offset, data.length - offset, charset);
    }

    private static Document parseXml(File file) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setNamespaceAware(true);
        // Android-Versionen unterscheiden sich darin, welche Parser-Features sie
        // unterstützen. Nicht unterstützte Sicherheitsoptionen dürfen den Import
        // eines ansonsten gültigen EPUBs nicht vollständig abbrechen.
        optionalFeature(factory, "http://xml.org/sax/features/external-general-entities", false);
        optionalFeature(factory, "http://xml.org/sax/features/external-parameter-entities", false);
        optionalFeature(factory, "http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
        try { factory.setXIncludeAware(false); } catch (UnsupportedOperationException ignored) { }
        try { factory.setExpandEntityReferences(false); } catch (UnsupportedOperationException ignored) { }
        try (FileInputStream input = new FileInputStream(file)) {
            return factory.newDocumentBuilder().parse(input);
        }
    }

    private static void optionalFeature(DocumentBuilderFactory factory, String feature, boolean value) {
        try { factory.setFeature(feature, value); }
        catch (ParserConfigurationException | AbstractMethodError ignored) { }
    }

    private static File findIgnoreCase(File root, String relativePath) {
        File current = root;
        for (String part : relativePath.split("/")) {
            File[] children = current.listFiles();
            if (children == null) return null;
            File match = null;
            for (File child : children) {
                if (child.getName().equalsIgnoreCase(part)) { match = child; break; }
            }
            if (match == null) return null;
            current = match;
        }
        return current;
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

    int chapterIndex(Uri target) {
        if (target == null || target.getPath() == null) return -1;
        try {
            File requested = new File(target.getPath()).getCanonicalFile();
            for (int i = 0; i < chapters.size(); i++) {
                if (chapters.get(i).file.getCanonicalFile().equals(requested)) return i;
            }
        } catch (Exception ignored) { }
        return -1;
    }

    private static String hrefPath(String href) {
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

    private static void cleanupBookCache(File booksDirectory, File protectedDirectory) {
        if (booksDirectory == null || !booksDirectory.isDirectory()) return;
        File[] directories = booksDirectory.listFiles(File::isDirectory);
        if (directories == null) return;
        Arrays.sort(directories, Comparator.comparingLong(File::lastModified).reversed());
        long retainedBytes = 0L;
        int retained = 0;
        final long limit = 200L * 1024L * 1024L;
        for (File directory : directories) {
            long bytes = directorySize(directory);
            boolean current = protectedDirectory != null && directory.equals(protectedDirectory);
            boolean keep = current || (retained < 2 && retainedBytes + bytes <= limit);
            if (keep) {
                retained++;
                retainedBytes += bytes;
            } else {
                deleteTree(directory);
            }
        }
    }

    private static long directorySize(File file) {
        if (file.isFile()) return file.length();
        long total = 0L;
        File[] children = file.listFiles();
        if (children != null) for (File child : children) total += directorySize(child);
        return total;
    }
}
