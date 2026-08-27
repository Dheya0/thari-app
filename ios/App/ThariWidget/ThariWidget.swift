import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), balance: "0.00 ر.س", currency: "SAR", updated: "الآن")
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = loadCurrentBalance()
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> ()) {
        let entry = loadCurrentBalance()
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadCurrentBalance() -> SimpleEntry {
        // Read from shared App Group UserDefaults
        let defaults = UserDefaults(suiteName: "group.com.thari.finance.app")
        let jsonString = defaults?.string(forKey: "thari_shared_balance")
        
        var balanceStr = "0.00 ر.س"
        var curr = "SAR"
        var updated = "الآن"

        if let data = jsonString?.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: data, options: []) as? [String: Any],
           let avail = json["availableBalance"] as? Double,
           let symbol = json["currencySymbol"] as? String {
            balanceStr = String(format: "%.2f %@", avail, symbol)
            curr = json["currency"] as? String ?? "SAR"
            updated = json["lastUpdated"] as? String ?? "الآن"
        }

        return SimpleEntry(date: Date(), balance: balanceStr, currency: curr, updated: updated)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let balance: String
    let currency: String
    let updated: String
}

struct ThariWidgetEntryView : View {
    var entry: Provider.Entry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("ثري — الرصيد المتاح")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(Color.gray)
                Spacer()
                Image(systemName: "wallet.pass.fill")
                    .foregroundColor(Color(red: 0.85, green: 0.72, blue: 0.47))
                    .font(.system(size: 12))
            }
            
            Spacer()
            
            Text(entry.balance)
                .font(.system(size: 18, weight: .black))
                .foregroundColor(.white)
                .lineLimit(1)
                .minimumScaleFactor(0.7)

            HStack {
                Text("تحديث: \(entry.updated)")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundColor(Color.secondary)
                Spacer()
            }
        }
        .padding(14)
        .containerBackground(Color(red: 0.04, green: 0.05, blue: 0.06), for: .widget)
    }
}

@main
struct ThariWidget: Widget {
    let kind: String = "ThariWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            ThariWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("محفظة ثري المالية")
        .description("اعرض رصيدك المتاح وصفوة حساباتك مباشرة على شاشتك الرئيسية.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
