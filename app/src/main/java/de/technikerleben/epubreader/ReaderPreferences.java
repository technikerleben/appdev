package de.technikerleben.epubreader;

import android.content.SharedPreferences;

final class ReaderPreferences {
    int fontSize;
    int margin;
    float lineHeight;
    int theme;
    int font;
    boolean keepScreenOn;
    boolean volumeKeys;
    String background;
    String foreground;
    String link;
    String fontFamily;

    static ReaderPreferences load(SharedPreferences preferences) {
        ReaderPreferences result = new ReaderPreferences();
        result.fontSize = preferences.getInt("font_size", 20);
        result.margin = preferences.getInt("margin", 18);
        result.lineHeight = preferences.getFloat("line_height", 1.6f);
        result.theme = preferences.getInt("theme", 0);
        result.font = preferences.getInt("font", 0);
        result.keepScreenOn = preferences.getBoolean("keep_screen_on", false);
        result.volumeKeys = preferences.getBoolean("volume_keys", false);
        result.resolve();
        return result;
    }

    void save(SharedPreferences preferences) {
        preferences.edit()
                .putInt("font_size", fontSize)
                .putInt("margin", margin)
                .putFloat("line_height", lineHeight)
                .putInt("theme", theme)
                .putInt("font", font)
                .putBoolean("keep_screen_on", keepScreenOn)
                .putBoolean("volume_keys", volumeKeys)
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
}
