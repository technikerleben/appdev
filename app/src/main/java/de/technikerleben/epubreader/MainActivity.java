package de.technikerleben.epubreader;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.ProgressDialog;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ListView;
import android.widget.ProgressBar;
import android.widget.SeekBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.File;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final int OPEN_EPUB = 41;
    private static final int SLATE = Color.rgb(62, 86, 104);
    private static final int PAPER = Color.rgb(245, 244, 241);
    private static final int RUST = Color.rgb(217, 122, 74);

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

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        store = getSharedPreferences("reader", MODE_PRIVATE);
        readerPreferences = ReaderPreferences.load(store);
        buildUi();
        applyBrightness();

        Uri incoming = getIntent().getData();
        if (incoming != null) {
            openBook(incoming, getIntent().getFlags());
        } else {
            String last = store.getString("last_uri", null);
            if (last != null) openBook(Uri.parse(last), 0);
            else showWelcome();
        }
    }

    private void buildUi() {
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
        setContentView(root);
        updateNavigation();
    }

    private Button toolButton(String description, String text, View.OnClickListener listener) {
        Button button = navButton(text, description, listener);
        button.setTextSize("Aa".equals(text) ? 15 : 22);
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
        intent.setType("application/epub+zip");
        intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/epub+zip", "application/zip"});
        startActivityForResult(intent, OPEN_EPUB);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == OPEN_EPUB && resultCode == RESULT_OK && data != null && data.getData() != null) {
            openBook(data.getData(), data.getFlags());
        }
    }

    private void openBook(Uri uri, int flags) {
        int takeFlags = flags & (Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        if (takeFlags != 0) {
            try { getContentResolver().takePersistableUriPermission(uri, takeFlags); }
            catch (SecurityException ignored) { }
        }
        ProgressDialog dialog = ProgressDialog.show(this, "EPUB wird geöffnet", "Inhalte werden vorbereitet …", true, false);
        worker.execute(() -> {
            try {
                EpubBook opened = EpubBook.open(this, uri);
                runOnUiThread(() -> {
                    dialog.dismiss();
                    book = opened;
                    bookUri = uri;
                    store.edit().putString("last_uri", uri.toString()).apply();
                    String prefix = bookKey();
                    chapter = Math.max(0, Math.min(store.getInt(prefix + "chapter", 0), book.chapters.size() - 1));
                    restoreRatio = store.getFloat(prefix + "ratio", 0f);
                    titleView.setText(book.title);
                    showChapter();
                });
            } catch (Exception error) {
                runOnUiThread(() -> {
                    dialog.dismiss();
                    Toast.makeText(this, "EPUB konnte nicht geöffnet werden: " + friendly(error), Toast.LENGTH_LONG).show();
                    if (book == null) showWelcome();
                });
            }
        });
    }

    private String friendly(Exception error) {
        String message = error.getMessage();
        return message == null || message.trim().isEmpty() ? "unbekanntes Dateiformat" : message;
    }

    private void showChapter() {
        if (book == null) return;
        savePositionNow();
        try {
            EpubBook.Chapter item = book.chapters.get(chapter);
            String base = item.file.getParentFile().toURI().toString();
            webView.loadDataWithBaseURL(base, book.html(chapter, readerPreferences), "application/xhtml+xml", "UTF-8", null);
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
        positionView.setText((chapter + 1) + " / " + book.chapters.size() + "  ·  " + book.chapters.get(chapter).title);
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

        TextView brightnessLabel = label(panel, "Helligkeit: " + readerPreferences.brightness + " %");
        SeekBar brightness = seek(panel, readerPreferences.brightness - 10, 90);
        brightness.setOnSeekBarChangeListener(listener(value -> brightnessLabel.setText("Helligkeit: " + (value + 10) + " %")));

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
                    readerPreferences.brightness = brightness.getProgress() + 10;
                    readerPreferences.font = fonts.getSelectedItemPosition();
                    readerPreferences.theme = themes.getSelectedItemPosition();
                    readerPreferences.save(store);
                    applyBrightness();
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

    private void applyBrightness() {
        WindowManager.LayoutParams params = getWindow().getAttributes();
        params.screenBrightness = readerPreferences.brightness / 100f;
        getWindow().setAttributes(params);
    }

    private String bookKey() {
        return "book_" + Integer.toHexString(bookUri.toString().hashCode()) + "_";
    }

    private float scrollRatio() {
        int range = Math.max(1, webView.scrollRange() - webView.getHeight());
        return Math.max(0f, Math.min(1f, webView.getScrollY() / (float) range));
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
        if (webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private final class ReaderWebView extends WebView {
        ReaderWebView() { super(MainActivity.this); setBackgroundColor(PAPER); }

        int scrollRange() { return computeVerticalScrollRange(); }

        @Override
        protected void onScrollChanged(int left, int top, int oldLeft, int oldTop) {
            super.onScrollChanged(left, top, oldLeft, oldTop);
            schedulePositionSave();
        }
    }

    private final class SafeClient extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            String scheme = request.getUrl().getScheme();
            return "http".equalsIgnoreCase(scheme) || "https".equalsIgnoreCase(scheme);
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
            view.postDelayed(() -> {
                int range = Math.max(0, webView.scrollRange() - webView.getHeight());
                webView.scrollTo(0, Math.round(range * ratio));
                updateProgress();
            }, 120);
        }
    }
}
