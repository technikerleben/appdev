package de.technikerleben.epubreader;

import android.app.Activity;
import android.app.AlertDialog;
import android.animation.ObjectAnimator;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.view.Gravity;
import android.view.GestureDetector;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewConfiguration;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.ProgressBar;
import android.widget.SeekBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;
import android.view.animation.DecelerateInterpolator;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.ArrayDeque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final int OPEN_EPUB = 41;
    private static final int SLATE = Color.rgb(62, 86, 104);
    private static final int PAPER = Color.rgb(245, 244, 241);
    private static final int RUST = Color.rgb(217, 122, 74);
    private static final String DIGEST_FEED = "https://technikerleben.github.io/dailydigest/opds.xml";
    private static final String RECENT_BOOKS = "recent_books";
    private static final int MAX_RECENT_BOOKS = 12;

    private static final class RecentBook {
        final String uri;
        final String title;
        final long lastRead;
        final boolean digest;

        RecentBook(String uri, String title, long lastRead, boolean digest) {
            this.uri = uri;
            this.title = title;
            this.lastRead = lastRead;
            this.digest = digest;
        }
    }

    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final Handler handler = new Handler();
    private SharedPreferences store;
    private ReaderPreferences readerPreferences;
    private EpubBook book;
    private Uri bookUri;
    private int chapter;
    private float restoreRatio;
    private ReaderWebView webView;
    private TextView titleView;
    private TextView positionView;
    private ProgressBar progress;
    private Button previous;
    private Button next;
    private Button bookmark;
    private Runnable pendingPositionSave;
    private View loadingOverlay;
    private TextView loadingMessage;
    private String pendingAnchor;
    private final ArrayDeque<ReadingLocation> linkHistory = new ArrayDeque<>();

    private static final class ReadingLocation {
        final int chapter;
        final float ratio;

        ReadingLocation(int chapter, float ratio) {
            this.chapter = chapter;
            this.ratio = ratio;
        }
    }

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        store = getSharedPreferences("reader", MODE_PRIVATE);
        readerPreferences = ReaderPreferences.load(store);
        buildUi();

        if (handleIncomingIntent(getIntent())) {
            return;
        }
        if (store.getBoolean("last_is_digest", false)) {
            refreshDigest(false);
        } else {
            String last = store.getString("last_uri", null);
            if (last != null) openBook(Uri.parse(last), 0);
            else showWelcome();
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleIncomingIntent(intent);
    }

    private boolean handleIncomingIntent(Intent intent) {
        if (intent == null) return false;
        Uri incoming = intent.getData();
        if (Intent.ACTION_SEND.equals(intent.getAction())) {
            if (android.os.Build.VERSION.SDK_INT >= 33) {
                incoming = intent.getParcelableExtra(Intent.EXTRA_STREAM, Uri.class);
            } else {
                //noinspection deprecation
                incoming = intent.getParcelableExtra(Intent.EXTRA_STREAM);
            }
        }
        if (incoming == null) return false;
        store.edit().putBoolean("last_is_digest", false).apply();
        openBook(incoming, intent.getFlags());
        return true;
    }

    private void buildUi() {
        FrameLayout container = new FrameLayout(this);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(PAPER);

        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setGravity(Gravity.CENTER_VERTICAL);
        toolbar.setPadding(dp(6), dp(4), dp(6), dp(4));
        toolbar.setBackgroundColor(SLATE);
        titleView = new TextView(this);
        titleView.setTextColor(Color.WHITE);
        titleView.setTextSize(17);
        titleView.setSingleLine(true);
        titleView.setText("EPUB Reader");
        toolbar.addView(titleView, new LinearLayout.LayoutParams(0, dp(48), 1));
        toolbar.addView(toolButton("Bibliothek", "▤", v -> showLibrary()));
        toolbar.addView(toolButton("Morgenblatt aktualisieren", "☀", v -> refreshDigest(true)));
        toolbar.addView(toolButton("Suchen", "⌕", v -> showSearch()));
        toolbar.addView(toolButton("Darstellung", "Aa", v -> showReaderSettings()));
        toolbar.addView(toolButton("Datei öffnen", "＋", v -> chooseBook()));
        root.addView(toolbar, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(56)));

        webView = new ReaderWebView();
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        settings.setLoadsImagesAutomatically(true);
        settings.setDefaultTextEncodingName("UTF-8");
        webView.setWebViewClient(new SafeClient());
        root.addView(webView, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 1));

        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(1000);
        progress.setProgressTintList(android.content.res.ColorStateList.valueOf(RUST));
        root.addView(progress, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(3)));

        LinearLayout navigation = new LinearLayout(this);
        navigation.setGravity(Gravity.CENTER);
        navigation.setPadding(dp(6), dp(2), dp(6), dp(3));
        navigation.setBackgroundColor(Color.rgb(38, 54, 66));
        previous = navButton("‹", "Vorheriges Kapitel", v -> moveChapter(-1));
        navigation.addView(previous, new LinearLayout.LayoutParams(dp(54), dp(48)));
        Button contents = navButton("☰", "Inhaltsverzeichnis", v -> showContents());
        navigation.addView(contents, new LinearLayout.LayoutParams(dp(54), dp(48)));
        positionView = new TextView(this);
        positionView.setGravity(Gravity.CENTER);
        positionView.setTextColor(Color.WHITE);
        positionView.setTextSize(13);
        navigation.addView(positionView, new LinearLayout.LayoutParams(0, dp(48), 1));
        bookmark = navButton("☆", "Lesezeichen", v -> toggleBookmark());
        navigation.addView(bookmark, new LinearLayout.LayoutParams(dp(54), dp(48)));
        next = navButton("›", "Nächstes Kapitel", v -> moveChapter(1));
        navigation.addView(next, new LinearLayout.LayoutParams(dp(54), dp(48)));
        root.addView(navigation, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(54)));
        container.addView(root, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        LinearLayout overlay = new LinearLayout(this);
        overlay.setOrientation(LinearLayout.VERTICAL);
        overlay.setGravity(Gravity.CENTER);
        overlay.setPadding(dp(32), dp(32), dp(32), dp(32));
        overlay.setBackgroundColor(0xaa263642);
        overlay.setClickable(true);
        ProgressBar spinner = new ProgressBar(this);
        overlay.addView(spinner, new LinearLayout.LayoutParams(dp(56), dp(56)));
        loadingMessage = new TextView(this);
        loadingMessage.setTextColor(Color.WHITE);
        loadingMessage.setTextSize(17);
        loadingMessage.setGravity(Gravity.CENTER);
        loadingMessage.setPadding(0, dp(16), 0, 0);
        overlay.addView(loadingMessage, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        loadingOverlay = overlay;
        loadingOverlay.setVisibility(View.GONE);
        container.addView(loadingOverlay, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(container);
        updateNavigation();
    }

    private void showLoading(String message) {
        loadingMessage.setText(message);
        loadingOverlay.setVisibility(View.VISIBLE);
    }

    private void hideLoading() {
        loadingOverlay.setVisibility(View.GONE);
    }

    private void runOnUiThreadIfAlive(Runnable action) {
        runOnUiThread(() -> {
            if (isFinishing() || isDestroyed()) return;
            action.run();
        });
    }

    private Button toolButton(String description, String text, View.OnClickListener listener) {
        Button button = navButton(text, description, listener);
        button.setTextSize("Aa".equals(text) ? 15 : 22);
        button.setMinWidth(0);
        button.setMinimumWidth(0);
        button.setLayoutParams(new LinearLayout.LayoutParams(dp(46), dp(48)));
        return button;
    }

    private Button navButton(String text, String description, View.OnClickListener listener) {
        Button button = new Button(this);
        button.setText(text);
        button.setTextSize(24);
        button.setTextColor(Color.WHITE);
        button.setGravity(Gravity.CENTER);
        button.setPadding(0, 0, 0, 0);
        button.setBackgroundColor(Color.TRANSPARENT);
        button.setContentDescription(description);
        button.setOnClickListener(listener);
        return button;
    }

    private void showWelcome() {
        String html = "<!doctype html><html><meta name=viewport content='width=device-width,initial-scale=1'>" +
                "<style>body{font-family:sans-serif;background:#F5F4F1;color:#263642;margin:28px;line-height:1.55}" +
                ".mark{font-size:58px;margin-top:18vh}.button{color:#9E4E22;font-weight:bold}</style>" +
                "<body><div class=mark>▤</div><h1>Deine EPUB-Bücher</h1>" +
                "<p>Öffne über <span class=button>＋</span> eine EPUB-Datei auf deinem Smartphone. " +
                "Das Buch bleibt lokal auf deinem Gerät.</p><p>Leseposition, Darstellung und Lesezeichen werden automatisch gespeichert.</p></body></html>";
        webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null);
    }

    private void chooseBook() {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        // Einige Android-Dateimanager melden EPUB-Dateien fälschlich als ZIP,
        // Binärdatei oder ganz ohne passenden MIME-Typ. Die App prüft den Inhalt
        // nach der Auswahl selbst zuverlässig.
        intent.setType("*/*");
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{
                "application/epub+zip", "application/zip", "application/octet-stream"
        });
        startActivityForResult(intent, OPEN_EPUB);
    }

    private void showLibrary() {
        List<RecentBook> books = loadRecentBooks();
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        TextView hint = new TextView(this);
        hint.setText(books.isEmpty() ? "Noch keine Bücher gelesen" : "Tippe zum Öffnen. Halte einen Eintrag gedrückt, um ihn zu entfernen.");
        hint.setTextColor(Color.DKGRAY);
        hint.setTextSize(14);
        hint.setPadding(dp(20), dp(12), dp(20), dp(8));
        panel.addView(hint);

        ListView list = new ListView(this);
        List<String> rows = new ArrayList<>();
        SimpleDateFormat format = new SimpleDateFormat("dd.MM.yyyy, HH:mm", Locale.GERMANY);
        String current = bookUri == null ? null : bookUri.toString();
        for (RecentBook item : books) {
            String marker = item.uri.equals(current) ? "▶  " : (item.digest ? "☀  " : "▤  ");
            rows.add(marker + item.title + "\nZuletzt gelesen: " + format.format(new Date(item.lastRead)));
        }
        list.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_list_item_1, rows));
        panel.addView(list, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,
                books.isEmpty() ? dp(40) : Math.min(dp(420), dp(72) * books.size())));

        AlertDialog library = new AlertDialog.Builder(this)
                .setTitle("Bibliothek")
                .setView(panel)
                .setPositiveButton("Morgenblatt", (dialog, which) -> refreshDigest(true))
                .setNeutralButton("Datei hinzufügen", (dialog, which) -> chooseBook())
                .setNegativeButton("Schließen", null)
                .create();
        list.setOnItemClickListener((parent, view, position, id) -> {
            RecentBook selected = books.get(position);
            library.dismiss();
            if (selected.digest) {
                store.edit().putBoolean("last_is_digest", true).apply();
                refreshDigest(false);
            } else {
                store.edit().putBoolean("last_is_digest", false).apply();
                openBook(Uri.parse(selected.uri), 0);
            }
        });
        list.setOnItemLongClickListener((parent, view, position, id) -> {
            RecentBook selected = books.get(position);
            new AlertDialog.Builder(this)
                    .setTitle("Aus Bibliothek entfernen?")
                    .setMessage("„" + selected.title + "“ wird nur aus dieser Liste entfernt. Die EPUB-Datei bleibt erhalten.")
                    .setPositiveButton("Entfernen", (dialog, which) -> {
                        books.remove(position);
                        saveRecentBooks(books);
                        library.dismiss();
                        showLibrary();
                    })
                    .setNegativeButton("Abbrechen", null)
                    .show();
            return true;
        });
        library.show();
    }

    private List<RecentBook> loadRecentBooks() {
        List<RecentBook> result = new ArrayList<>();
        try {
            JSONArray array = new JSONArray(store.getString(RECENT_BOOKS, "[]"));
            for (int i = 0; i < array.length(); i++) {
                JSONObject item = array.getJSONObject(i);
                result.add(new RecentBook(item.getString("uri"), item.optString("title", "Unbenanntes Buch"),
                        item.optLong("lastRead", 0), item.optBoolean("digest", false)));
            }
        } catch (Exception ignored) { }
        return result;
    }

    private void saveRecentBooks(List<RecentBook> books) {
        JSONArray array = new JSONArray();
        try {
            for (int i = 0; i < Math.min(books.size(), MAX_RECENT_BOOKS); i++) {
                RecentBook item = books.get(i);
                JSONObject json = new JSONObject();
                json.put("uri", item.uri);
                json.put("title", item.title);
                json.put("lastRead", item.lastRead);
                json.put("digest", item.digest);
                array.put(json);
            }
        } catch (Exception ignored) { }
        store.edit().putString(RECENT_BOOKS, array.toString()).apply();
    }

    private void rememberBook(String title, Uri uri, boolean digest) {
        List<RecentBook> books = loadRecentBooks();
        String key = uri.toString();
        for (int i = books.size() - 1; i >= 0; i--) {
            if (books.get(i).uri.equals(key) || (digest && books.get(i).digest)) books.remove(i);
        }
        books.add(0, new RecentBook(key, title, System.currentTimeMillis(), digest));
        saveRecentBooks(books);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == OPEN_EPUB && resultCode == RESULT_OK && data != null && data.getData() != null) {
            store.edit().putBoolean("last_is_digest", false).apply();
            openBook(data.getData(), data.getFlags());
        }
    }

    private void refreshDigest(boolean requestedByUser) {
        File digestDir = new File(getFilesDir(), "morgenblatt");
        File digestFile = new File(digestDir, "dailydigest.epub");
        showLoading("Aktuelle Morgenblatt-Ausgabe wird geladen …");
        worker.execute(() -> {
            File temporary = new File(digestDir, "dailydigest.tmp");
            try {
                if (!digestDir.exists() && !digestDir.mkdirs()) throw new IllegalStateException("Speicherordner konnte nicht erstellt werden.");
                String feed = downloadText(DIGEST_FEED);
                String epubUrl = findEpubUrl(feed);
                downloadFile(epubUrl, temporary);
                if (digestFile.exists() && !digestFile.delete()) throw new IllegalStateException("Alte Ausgabe konnte nicht ersetzt werden.");
                if (!temporary.renameTo(digestFile)) {
                    Files.copy(temporary.toPath(), digestFile.toPath());
                    temporary.delete();
                }
                runOnUiThreadIfAlive(() -> {
                    hideLoading();
                    store.edit().putBoolean("last_is_digest", true).apply();
                    openBook(Uri.fromFile(digestFile), 0);
                });
            } catch (Exception error) {
                temporary.delete();
                runOnUiThreadIfAlive(() -> {
                    hideLoading();
                    if (digestFile.isFile()) {
                        if (requestedByUser) Toast.makeText(this, "Keine neue Ausgabe erreichbar – gespeicherte Ausgabe wird geöffnet.", Toast.LENGTH_LONG).show();
                        store.edit().putBoolean("last_is_digest", true).apply();
                        openBook(Uri.fromFile(digestFile), 0);
                    } else {
                        new AlertDialog.Builder(this)
                                .setTitle("Morgenblatt nicht erreichbar")
                                .setMessage(friendly(error))
                                .setPositiveButton("Erneut versuchen", (alert, which) -> refreshDigest(true))
                                .setNegativeButton("Schließen", null)
                                .show();
                        if (book == null) showWelcome();
                    }
                });
            }
        });
    }

    private String downloadText(String address) throws Exception {
        HttpURLConnection connection = openConnection(address);
        try (InputStream input = connection.getInputStream()) {
            byte[] data = readLimited(input, 1024 * 1024);
            return new String(data, StandardCharsets.UTF_8);
        } finally {
            connection.disconnect();
        }
    }

    private void downloadFile(String address, File target) throws Exception {
        HttpURLConnection connection = openConnection(address);
        try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(target)) {
            byte[] buffer = new byte[32 * 1024];
            int read;
            long total = 0;
            while ((read = input.read(buffer)) != -1) {
                total += read;
                if (total > 100L * 1024L * 1024L) throw new IllegalArgumentException("Die EPUB-Datei ist unerwartet groß.");
                output.write(buffer, 0, read);
            }
            if (total == 0) throw new IllegalArgumentException("Die heruntergeladene EPUB-Datei ist leer.");
        } finally {
            connection.disconnect();
        }
    }

    private HttpURLConnection openConnection(String address) throws Exception {
        URL url = new URL(address);
        if (!"https".equalsIgnoreCase(url.getProtocol()) || !"technikerleben.github.io".equalsIgnoreCase(url.getHost())) {
            throw new SecurityException("Der Feed verweist auf eine nicht erlaubte Downloadadresse.");
        }
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setConnectTimeout(12_000);
        connection.setReadTimeout(20_000);
        connection.setInstanceFollowRedirects(true);
        connection.setRequestProperty("User-Agent", "EPUB-Reader/1.2");
        int status = connection.getResponseCode();
        if (status < 200 || status >= 300) {
            connection.disconnect();
            throw new IllegalStateException("Der Server antwortet mit HTTP " + status + ".");
        }
        return connection;
    }

    private byte[] readLimited(InputStream input, int maximum) throws Exception {
        java.io.ByteArrayOutputStream output = new java.io.ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int read;
        while ((read = input.read(buffer)) != -1) {
            if (output.size() + read > maximum) throw new IllegalArgumentException("Der OPDS-Feed ist unerwartet groß.");
            output.write(buffer, 0, read);
        }
        return output.toByteArray();
    }

    private String findEpubUrl(String feed) {
        Matcher tags = Pattern.compile("<link\\b[^>]*>", Pattern.CASE_INSENSITIVE).matcher(feed);
        while (tags.find()) {
            String tag = tags.group();
            String type = attribute(tag, "type");
            String href = attribute(tag, "href");
            if ("application/epub+zip".equalsIgnoreCase(type) && href != null) return href.replace("&amp;", "&");
        }
        throw new IllegalArgumentException("Im OPDS-Feed wurde keine EPUB-Ausgabe gefunden.");
    }

    private String attribute(String tag, String name) {
        Matcher matcher = Pattern.compile("\\b" + name + "\\s*=\\s*(['\"])(.*?)\\1", Pattern.CASE_INSENSITIVE).matcher(tag);
        return matcher.find() ? matcher.group(2) : null;
    }

    private void openBook(Uri uri, int flags) {
        int takeFlags = flags & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        if (takeFlags != 0) {
            try { getContentResolver().takePersistableUriPermission(uri, takeFlags); }
            catch (SecurityException ignored) { }
        }
        showLoading("EPUB wird geöffnet …");
        worker.execute(() -> {
            try {
                EpubBook opened = EpubBook.open(this, uri);
                runOnUiThreadIfAlive(() -> {
                    hideLoading();
                    book = opened;
                    bookUri = uri;
                    store.edit().putString("last_uri", uri.toString()).apply();
                    String prefix = bookKey();
                    chapter = Math.max(0, Math.min(store.getInt(prefix + "chapter", 0), book.chapters.size() - 1));
                    restoreRatio = store.getFloat(prefix + "ratio", 0f);
                    titleView.setText(book.title);
                    rememberBook(book.title, bookUri, store.getBoolean("last_is_digest", false));
                    showChapter();
                });
            } catch (Exception error) {
                runOnUiThreadIfAlive(() -> {
                    hideLoading();
                    new AlertDialog.Builder(this)
                            .setTitle("EPUB konnte nicht geöffnet werden")
                            .setMessage(friendly(error))
                            .setPositiveButton("Andere Datei wählen", (alert, which) -> chooseBook())
                            .setNegativeButton("Schließen", null)
                            .show();
                    if (book == null) showWelcome();
                });
            }
        });
    }

    private String friendly(Exception error) {
        Throwable cause = error;
        while (cause.getCause() != null) cause = cause.getCause();
        String message = cause.getMessage();
        return message == null || message.trim().isEmpty() ? "unbekanntes Dateiformat" : message;
    }

    private void showChapter() {
        showChapter(null);
    }

    private void showChapter(String anchor) {
        if (book == null) return;
        savePositionNow();
        try {
            EpubBook.Chapter item = book.chapters.get(chapter);
            pendingAnchor = anchor;
            String base = item.file.toURI().toString();
            if (anchor != null && !anchor.isEmpty()) base += "#" + Uri.encode(anchor);
            // EPUB-Kapitel sind häufig als XHTML deklariert, enthalten in der
            // Praxis aber kleine HTML-Unsauberkeiten. text/html rendert sie wie
            // ein normaler E-Book-Reader, statt eine XML-Fehlerseite anzuzeigen.
            webView.loadDataWithBaseURL(base, book.html(chapter, readerPreferences), "text/html", "UTF-8", null);
            updateNavigation();
        } catch (Exception error) {
            Toast.makeText(this, "Kapitel konnte nicht angezeigt werden.", Toast.LENGTH_LONG).show();
        }
    }

    private void moveChapter(int direction) {
        if (book == null) return;
        int target = chapter + direction;
        if (target < 0 || target >= book.chapters.size()) return;
        savePositionNow();
        chapter = target;
        restoreRatio = 0f;
        showChapter();
    }

    private void updateNavigation() {
        boolean ready = book != null;
        previous.setEnabled(ready && chapter > 0);
        next.setEnabled(ready && chapter < book.chapters.size() - 1);
        previous.setAlpha(previous.isEnabled() ? 1f : .3f);
        next.setAlpha(next.isEnabled() ? 1f : .3f);
        if (!ready) {
            positionView.setText("Noch kein Buch geöffnet");
            bookmark.setText("☆");
            return;
        }
        positionView.setText((chapter + 1) + " / " + book.chapters.size() + "  ·  Seite " +
                (webView.currentPage() + 1) + " / " + webView.pageCount() + "\n" + book.chapters.get(chapter).title);
        bookmark.setText(bookmarks().contains(chapter) ? "★" : "☆");
        updateProgress();
    }

    private void showContents() {
        if (book == null) return;
        List<String> rows = new ArrayList<>();
        Set<Integer> marks = bookmarks();
        for (int i = 0; i < book.chapters.size(); i++) {
            rows.add((marks.contains(i) ? "★  " : "") + (i + 1) + ".  " + book.chapters.get(i).title);
        }
        ListView list = new ListView(this);
        list.setAdapter(new ArrayAdapter<>(this, android.R.layout.simple_list_item_1, rows));
        AlertDialog dialog = new AlertDialog.Builder(this).setTitle("Inhaltsverzeichnis").setView(list).setNegativeButton("Schließen", null).create();
        list.setSelection(chapter);
        list.setOnItemClickListener((parent, view, position, id) -> {
            savePositionNow();
            chapter = position;
            restoreRatio = 0f;
            dialog.dismiss();
            showChapter();
        });
        dialog.show();
    }

    private void toggleBookmark() {
        if (book == null) return;
        Set<Integer> marks = bookmarks();
        if (!marks.add(chapter)) marks.remove(chapter);
        Set<String> encoded = new HashSet<>();
        for (Integer value : marks) encoded.add(String.valueOf(value));
        store.edit().putStringSet(bookKey() + "bookmarks", encoded).apply();
        updateNavigation();
    }

    private Set<Integer> bookmarks() {
        Set<Integer> result = new HashSet<>();
        if (bookUri == null) return result;
        for (String item : store.getStringSet(bookKey() + "bookmarks", new HashSet<>())) {
            try { result.add(Integer.parseInt(item)); } catch (NumberFormatException ignored) { }
        }
        return result;
    }

    private void showSearch() {
        if (book == null) return;
        EditText input = new EditText(this);
        input.setSingleLine(true);
        input.setHint("Wort im Kapitel");
        input.setPadding(dp(20), dp(4), dp(20), dp(4));
        new AlertDialog.Builder(this)
                .setTitle("Im Kapitel suchen")
                .setView(input)
                .setPositiveButton("Suchen", (dialog, which) -> webView.findAllAsync(input.getText().toString()))
                .setNeutralButton("Markierungen löschen", (dialog, which) -> webView.clearMatches())
                .setNegativeButton("Abbrechen", null)
                .show();
    }

    private void showReaderSettings() {
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setPadding(dp(22), dp(4), dp(22), 0);

        TextView fontSizeLabel = label(panel, "Schriftgröße: " + readerPreferences.fontSize + " px");
        SeekBar fontSize = seek(panel, readerPreferences.fontSize - 14, 20);
        fontSize.setOnSeekBarChangeListener(listener(value -> fontSizeLabel.setText("Schriftgröße: " + (value + 14) + " px")));

        TextView lineLabel = label(panel, "Zeilenabstand: " + String.format(java.util.Locale.GERMANY, "%.1f", readerPreferences.lineHeight));
        SeekBar line = seek(panel, Math.round((readerPreferences.lineHeight - 1.2f) * 10), 10);
        line.setOnSeekBarChangeListener(listener(value -> lineLabel.setText("Zeilenabstand: " + String.format(java.util.Locale.GERMANY, "%.1f", 1.2f + value / 10f))));

        TextView marginLabel = label(panel, "Seitenrand: " + readerPreferences.margin + " px");
        SeekBar margin = seek(panel, readerPreferences.margin - 8, 32);
        margin.setOnSeekBarChangeListener(listener(value -> marginLabel.setText("Seitenrand: " + (value + 8) + " px")));

        label(panel, "Schriftart");
        Spinner fonts = spinner(panel, new String[]{"Buchschrift (Serif)", "Klare Schrift", "Monospace", "Schmal"}, readerPreferences.font);
        label(panel, "Hintergrund");
        Spinner themes = spinner(panel, new String[]{"Warmweiß", "Reinweiß", "Sepia", "Dunkel", "Schwarz"}, readerPreferences.theme);

        new AlertDialog.Builder(this)
                .setTitle("Darstellung")
                .setView(panel)
                .setPositiveButton("Übernehmen", (dialog, which) -> {
                    savePositionNow();
                    restoreRatio = scrollRatio();
                    readerPreferences.fontSize = fontSize.getProgress() + 14;
                    readerPreferences.lineHeight = 1.2f + line.getProgress() / 10f;
                    readerPreferences.margin = margin.getProgress() + 8;
                    readerPreferences.font = fonts.getSelectedItemPosition();
                    readerPreferences.theme = themes.getSelectedItemPosition();
                    readerPreferences.save(store);
                    if (book != null) showChapter();
                })
                .setNegativeButton("Abbrechen", null)
                .show();
    }

    private TextView label(LinearLayout panel, String text) {
        TextView label = new TextView(this);
        label.setText(text);
        label.setTextSize(15);
        label.setTextColor(Color.rgb(38, 54, 66));
        label.setPadding(0, dp(12), 0, 0);
        panel.addView(label);
        return label;
    }

    private SeekBar seek(LinearLayout panel, int progress, int max) {
        SeekBar seek = new SeekBar(this);
        seek.setMax(max);
        seek.setProgress(progress);
        panel.addView(seek, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(42)));
        return seek;
    }

    private Spinner spinner(LinearLayout panel, String[] entries, int selected) {
        Spinner spinner = new Spinner(this);
        ArrayAdapter<String> adapter = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, entries);
        spinner.setAdapter(adapter);
        spinner.setSelection(selected);
        panel.addView(spinner, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(48)));
        return spinner;
    }

    private SeekBar.OnSeekBarChangeListener listener(java.util.function.IntConsumer action) {
        return new SeekBar.OnSeekBarChangeListener() {
            public void onProgressChanged(SeekBar seekBar, int value, boolean fromUser) { action.accept(value); }
            public void onStartTrackingTouch(SeekBar seekBar) { }
            public void onStopTrackingTouch(SeekBar seekBar) { }
        };
    }

    private String bookKey() {
        return "book_" + Integer.toHexString(bookUri.toString().hashCode()) + "_";
    }

    private float scrollRatio() {
        int range = Math.max(1, webView.scrollRange() - webView.getWidth());
        return Math.max(0f, Math.min(1f, webView.getScrollX() / (float) range));
    }

    private void updateProgress() {
        if (book == null) { progress.setProgress(0); return; }
        float overall = (chapter + scrollRatio()) / book.chapters.size();
        progress.setProgress(Math.round(overall * 1000));
    }

    private void schedulePositionSave() {
        updateProgress();
        if (pendingPositionSave != null) handler.removeCallbacks(pendingPositionSave);
        pendingPositionSave = this::savePositionNow;
        handler.postDelayed(pendingPositionSave, 500);
    }

    private void savePositionNow() {
        if (book == null || bookUri == null) return;
        store.edit().putInt(bookKey() + "chapter", chapter).putFloat(bookKey() + "ratio", scrollRatio()).apply();
    }

    @Override
    protected void onPause() {
        savePositionNow();
        if (book != null && bookUri != null) {
            rememberBook(book.title, bookUri, store.getBoolean("last_is_digest", false));
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        worker.shutdownNow();
        webView.destroy();
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (!linkHistory.isEmpty()) {
            ReadingLocation previousLocation = linkHistory.removeLast();
            chapter = previousLocation.chapter;
            restoreRatio = previousLocation.ratio;
            showChapter();
        } else if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private final class ReaderWebView extends WebView {
        private final GestureDetector gestures;
        private final int touchSlop;

        ReaderWebView() {
            super(MainActivity.this);
            touchSlop = ViewConfiguration.get(MainActivity.this).getScaledTouchSlop();
            gestures = new GestureDetector(MainActivity.this, new GestureDetector.SimpleOnGestureListener() {
                @Override
                public boolean onDown(MotionEvent event) {
                    return false;
                }

                @Override
                public boolean onFling(MotionEvent start, MotionEvent end, float velocityX, float velocityY) {
                    if (start == null || end == null) return false;
                    float dx = end.getX() - start.getX();
                    float dy = end.getY() - start.getY();
                    if (Math.abs(dx) <= touchSlop || Math.abs(dx) <= Math.abs(dy)) return false;
                    turnPage(dx < 0 ? 1 : -1);
                    return true;
                }
            });
            gestures.setIsLongpressEnabled(true);
            setBackgroundColor(PAPER);
            setVerticalScrollBarEnabled(false);
            setHorizontalScrollBarEnabled(false);
            setOverScrollMode(OVER_SCROLL_NEVER);
        }

        int scrollRange() { return computeHorizontalScrollRange(); }

        int pageCount() {
            if (getWidth() <= 0) return 1;
            return Math.max(1, (int) Math.ceil(scrollRange() / (double) getWidth()));
        }

        int currentPage() {
            if (getWidth() <= 0) return 0;
            return Math.max(0, Math.min(pageCount() - 1, Math.round(getScrollX() / (float) getWidth())));
        }

        void showPage(int page) {
            int targetPage = Math.max(0, Math.min(pageCount() - 1, page));
            int maximum = Math.max(0, scrollRange() - getWidth());
            int target = Math.min(maximum, targetPage * getWidth());
            ObjectAnimator animation = ObjectAnimator.ofInt(this, "scrollX", getScrollX(), target);
            animation.setDuration(220);
            animation.setInterpolator(new DecelerateInterpolator());
            animation.start();
            handler.postDelayed(MainActivity.this::updateNavigation, 240);
        }

        private void turnPage(int direction) {
            int page = currentPage();
            if (direction > 0 && page < pageCount() - 1) {
                showPage(page + 1);
            } else if (direction < 0 && page > 0) {
                showPage(page - 1);
            } else if (direction > 0 && book != null && chapter < book.chapters.size() - 1) {
                savePositionNow();
                chapter++;
                restoreRatio = 0f;
                showChapter();
            } else if (direction < 0 && book != null && chapter > 0) {
                savePositionNow();
                chapter--;
                restoreRatio = 1f;
                showChapter();
            }
        }

        @Override
        public boolean onTouchEvent(MotionEvent event) {
            boolean webHandled = super.onTouchEvent(event);
            boolean gestureHandled = gestures.onTouchEvent(event);
            return gestureHandled || webHandled;
        }

        @Override
        protected void onScrollChanged(int left, int top, int oldLeft, int oldTop) {
            super.onScrollChanged(left, top, oldLeft, oldTop);
            schedulePositionSave();
        }
    }

    private final class SafeClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri target = request.getUrl();
            String scheme = target.getScheme();
            if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                new AlertDialog.Builder(MainActivity.this)
                        .setTitle("Externen Link öffnen?")
                        .setMessage(target.toString())
                        .setPositiveButton("Im Browser öffnen", (dialog, which) -> {
                            try { startActivity(new Intent(Intent.ACTION_VIEW, target)); }
                            catch (Exception error) { Toast.makeText(MainActivity.this, "Kein Browser verfügbar.", Toast.LENGTH_LONG).show(); }
                        })
                        .setNegativeButton("Abbrechen", null)
                        .show();
                return true;
            }
            if ("file".equalsIgnoreCase(scheme) && book != null) {
                int targetChapter = book.chapterIndex(target);
                if (targetChapter >= 0) {
                    linkHistory.addLast(new ReadingLocation(chapter, scrollRatio()));
                    chapter = targetChapter;
                    restoreRatio = 0f;
                    showChapter(target.getFragment());
                    return true;
                }
            }
            return false;
        }

        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            String scheme = request.getUrl().getScheme();
            if ("http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme)) {
                return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(new byte[0]));
            }
            return super.shouldInterceptRequest(view, request);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            final float ratio = restoreRatio;
            restoreRatio = 0f;
            final boolean hasAnchor = pendingAnchor != null && !pendingAnchor.isEmpty();
            pendingAnchor = null;
            view.postDelayed(() -> {
                int range = Math.max(0, webView.scrollRange() - webView.getWidth());
                if (!hasAnchor) webView.scrollTo(Math.round(range * ratio), 0);
                // Nach dem Layout immer exakt auf die nächstgelegene Seite einrasten.
                webView.showPage(webView.currentPage());
                updateNavigation();
            }, 120);
        }
    }
}
