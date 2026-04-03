package com.xatruchpos.xatruchtech;

import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import fi.iki.elonen.NanoHTTPD;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.util.HashMap;
import java.util.Map;

public class POSServer extends NanoHTTPD {
    private Context context;
    private static final String DB_NAME = "restaurante.db";

    public POSServer(Context context, int port) {
        super(port);
        this.context = context;
    }

    @Override
    public Response serve(IHTTPSession session) {
        String uri = session.getUri();
        Method method = session.getMethod();

        // CORS Headers
        Response res;
        if (method == Method.OPTIONS) {
            res = newFixedLengthResponse(Response.Status.OK, MIME_PLAINTEXT, "");
            addCORSHeaders(res);
            return res;
        }

        try {
            if (uri.equals("/api/menu") && method == Method.GET) {
                return jsonResponse(queryToJSON("SELECT * FROM menu ORDER BY nombre"));
            } 
            else if (uri.equals("/api/ordenes-pendientes") && method == Method.GET) {
                // Simplificado para el ejemplo, agruparíamos igual que en Node
                return jsonResponse(queryToJSON("SELECT * FROM ordenes WHERE estado='Pendiente'"));
            }
            // Aquí añadiríamos el resto de endpoints similares a server.js
            
            return newFixedLengthResponse(Response.Status.NOT_FOUND, MIME_PLAINTEXT, "Not Found");
        } catch (Exception e) {
            return newFixedLengthResponse(Response.Status.INTERNAL_ERROR, MIME_PLAINTEXT, e.getMessage());
        }
    }

    private Response jsonResponse(String json) {
        Response res = newFixedLengthResponse(Response.Status.OK, "application/json", json);
        addCORSHeaders(res);
        return res;
    }

    private void addCORSHeaders(Response res) {
        res.addHeader("Access-Control-Allow-Origin", "*");
        res.addHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        res.addHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    private String queryToJSON(String sql) {
        JSONArray jsonArray = new JSONArray();
        SQLiteDatabase db = null;
        Cursor cursor = null;
        try {
            // Capacitor suele guardar la DB en esta ruta por defecto
            File dbFile = context.getDatabasePath("rkStorage"); // Nombre interno que usa el plugin de SQLite
            if (!dbFile.exists()) {
                 return "[]";
            }
            db = SQLiteDatabase.openDatabase(dbFile.getAbsolutePath(), null, SQLiteDatabase.OPEN_READONLY);
            cursor = db.rawQuery(sql, null);
            
            if (cursor.moveToFirst()) {
                do {
                    JSONObject obj = new JSONObject();
                    for (int i = 0; i < cursor.getColumnCount(); i++) {
                        String colName = cursor.getColumnName(i);
                        switch (cursor.getType(i)) {
                            case Cursor.FIELD_TYPE_FLOAT: obj.put(colName, cursor.getDouble(i)); break;
                            case Cursor.FIELD_TYPE_INTEGER: obj.put(colName, cursor.getLong(i)); break;
                            case Cursor.FIELD_TYPE_STRING: obj.put(colName, cursor.getString(i)); break;
                            default: obj.put(colName, cursor.getString(i)); break;
                        }
                    }
                    jsonArray.put(obj);
                } while (cursor.moveToNext());
            }
        } catch (Exception e) {
            e.printStackTrace();
        } finally {
            if (cursor != null) cursor.close();
            if (db != null) db.close();
        }
        return jsonArray.toString();
    }
}
