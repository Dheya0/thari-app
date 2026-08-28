package com.thari.finance.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.SharedPreferences;
import android.widget.RemoteViews;
import org.json.JSONObject;

public class ThariWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.thari_widget_layout);

        SharedPreferences prefs = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
        String jsonStr = prefs.getString("thari_shared_balance", null);

        String balanceText = "0.00 ر.س";
        String updatedText = "الآن";

        if (jsonStr != null) {
            try {
                JSONObject json = new JSONObject(jsonStr);
                double avail = json.optDouble("availableBalance", 0.0);
                String symbol = json.optString("currencySymbol", "ر.س");
                updatedText = json.optString("lastUpdated", "الآن");
                balanceText = String.format("%.2f %s", avail, symbol);
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        views.setTextViewText(R.id.widget_balance_text, balanceText);
        views.setTextViewText(R.id.widget_updated_text, "تحديث: " + updatedText);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
