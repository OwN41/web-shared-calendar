package home.familycalendar;

import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends BridgeActivity {
    private static final int PROBE_TIMEOUT_MS = 2000;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        probeServer();
    }

    // Without a reachable server the WebView sits on a blank page until the OS connect timeout.
    // Check quickly and open the bundled offline page (saved copy) instead when the server doesn't answer.
    private void probeServer() {
        if (bridge == null) return;
        final String serverUrl = bridge.getServerUrl();
        final String errorUrl = bridge.getErrorUrl();
        if (serverUrl == null || errorUrl == null) return;

        new Thread(() -> {
            boolean up = false;
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(serverUrl + "/api/health").openConnection();
                c.setConnectTimeout(PROBE_TIMEOUT_MS);
                c.setReadTimeout(PROBE_TIMEOUT_MS);
                up = c.getResponseCode() == 200;
                c.disconnect();
            } catch (Exception ignored) {
            }
            if (up) return;
            runOnUiThread(() -> {
                WebView webView = bridge.getWebView();
                if (webView != null) {
                    webView.stopLoading();
                    webView.loadUrl(errorUrl);
                }
            });
        }).start();
    }
}
