package com.xatruchpos.xatruchtech;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import java.io.IOException;

public class MainActivity extends BridgeActivity {
    private POSServer server;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Iniciamos el servidor en el puerto 3000
        server = new POSServer(this, 3000);
        try {
            server.start();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (server != null) {
            server.stop();
        }
    }
}
