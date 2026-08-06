# No project-specific ProGuard rules are required.
# Die App verwendet keine Reflection-basierten Modelle oder externen Bibliotheken.
# WebViewClient-Callbacks und Android-Komponenten werden über das Framework erreicht.
-keepclassmembers class * extends android.webkit.WebViewClient {
    public *;
}
