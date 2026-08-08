package de.technikerleben.epubreader;

import android.content.SharedPreferences;

final class ReaderPreferences {
    static final int MIN_FONT_SIZE_PT = 8;
    static final int MAX_FONT_SIZE_PT = 24;
    static final int DEFAULT_FONT_SIZE_PT = 15;

    int fontSize;
    int margin;
    float lineHeight;
    int theme;
    int font;
    boolean keepScreenOn;
    boolean volumeKeys;
    boolean publisherLayout;
    String background;
    String foreground;
    String link;
    String fontFamily;
    float systemFontScale = 1f;

    static ReaderPreferences load(SharedPreferences preferences) {
        ReaderPreferences result = new ReaderPreferences();
        boolean storedInPoints = preferences.getBoolean("font_size_points", false);
        if (storedInPoints) {
            result.fontSize = preferences.getInt("font_size", DEFAULT_FONT_SIZE_PT);
        } else if (preferences.contains("font_size")) {
            // Releases up to 1.4.2 stored CSS pixels. One CSS point is 4/3 px.
            result.fontSize = Math.round(preferences.getInt("font_size", 20) * 0.75f);
        } else {
            result.fontSize = DEFAULT_FONT_SIZE_PT;
        }
        result.fontSize = clampFontSize(result.fontSize);
        preferences.edit()
                .putInt("font_size", result.fontSize)
                .putBoolean("font_size_points", true)
                .apply();
        result.margin = preferences.getInt("margin", 18);
        result.lineHeight = preferences.getFloat("line_height", 1.6f);
        result.theme = preferences.getInt("theme", 0);
        result.font = preferences.getInt("font", 0);
        result.keepScreenOn = preferences.getBoolean("keep_screen_on", false);
        result.volumeKeys = preferences.getBoolean("volume_keys", false);
        result.publisherLayout = preferences.getBoolean("publisher_layout", false);
        result.resolve();
        return result;
    }

    void save(SharedPreferences preferences) {
        fontSize = clampFontSize(fontSize);
        preferences.edit()
                .putInt("font_size", fontSize)
                .putBoolean("font_size_points", true)
                .putInt("margin", margin)
                .putFloat("line_height", lineHeight)
                .putInt("theme", theme)
                .putInt("font", font)
                .putBoolean("keep_screen_on", keepScreenOn)
                .putBoolean("volume_keys", volumeKeys)
                .putBoolean("publisher_layout", publisherLayout)
                .apply();
        resolve();
    }

    void resolve() {
        String[][] themes = {
                {"#F5F4F1", "#202529", "#9E4E22"},
                {"#FFFFFF", "#111111", "#315D7A"},
                {"#F3E5C8", "#3A3027", "#8A4B25"},
                {"#20272C", "#E6E8E9", "#EBA882"},
                {"#000000", "#D6D6D6", "#A8D49D"}
        };
        String[] fonts = {"Georgia,serif", "sans-serif", "monospace", "'sans-serif-condensed',sans-serif"};
        theme = Math.max(0, Math.min(theme, themes.length - 1));
        font = Math.max(0, Math.min(font, fonts.length - 1));
        background = themes[theme][0];
        foreground = themes[theme][1];
        link = themes[theme][2];
        fontFamily = fonts[font];
    }

    private static int clampFontSize(int value) {
        return Math.max(MIN_FONT_SIZE_PT, Math.min(value, MAX_FONT_SIZE_PT));
    }
}
