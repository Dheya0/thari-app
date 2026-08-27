package com.thari.finance.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.SharedPreferences
import android.widget.RemoteViews
import org.json.JSONObject

class ThariWidgetProvider : AppWidgetProvider() {

    override func onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for appWidgetId in appWidgetIds {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }

    companion5: fun updateAppWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
        val views = RemoteViews(context.packageName, R.layout.thari_widget_layout)

        // Read from SharedPreferences
        val prefs: SharedPreferences = context.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE)
        val jsonStr = prefs.getString("thari_shared_balance", null)

        var balanceText = "0.00 ر.س"
        var updatedText = "الآن"

        if (jsonStr != null) {
            try {
                val json = JSONObject(jsonStr)
                val avail = json.optDouble("availableBalance", 0.0)
                val symbol = json.optString("currencySymbol", "ر.س")
                updatedText = json.optString("lastUpdated", "الآن")
                balanceText = String.format("%.2f %s", avail, symbol)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }

        views.setTextViewText(R.id.widget_balance_text, balanceText)
        views.setTextViewText(R.id.widget_updated_text, "تحديث: $updatedText")

        appWidgetManager.updateAppWidget(appWidgetId, views)
    }
}
