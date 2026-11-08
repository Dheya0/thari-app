package com.thariwealth.smartsuite;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Ensure native window background, status bar, and navigation bar match #0A0D10 (zero white flash)
        Window window = getWindow();
        if (window != null) {
            int darkBg = Color.parseColor("#0A0D10");
            window.getDecorView().setBackgroundColor(darkBg);
            window.setStatusBarColor(darkBg);
            window.setNavigationBarColor(darkBg);
        }

        optimizeWebViewPerformance();
    }

    @Override
    public void onResume() {
        super.onResume();
        optimizeWebViewPerformance();
    }

    private void optimizeWebViewPerformance() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                webView.setBackgroundColor(Color.parseColor("#0A0D10"));
                // Hardware acceleration for 60fps/120fps touch, swipe, and scroll responsiveness
                webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
                // Disable sluggish native overscroll glow and scrollbars so touch gestures are instant
                webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
                webView.setVerticalScrollBarEnabled(false);
                webView.setHorizontalScrollBarEnabled(false);

                WebSettings settings = webView.getSettings();
                if (settings != null) {
                    settings.setDomStorageEnabled(true);
                    settings.setDatabaseEnabled(true);
                    settings.setCacheMode(WebSettings.LOAD_DEFAULT);
                    settings.setMediaPlaybackRequiresUserGesture(false);
                    settings.setTextZoom(100);
                }
            }
        } catch (Exception ignored) {
            // Safe fallback if bridge is not yet initialized
        }
    }
}
