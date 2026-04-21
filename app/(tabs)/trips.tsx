import { Text, View } from "react-native";

const MOCK_TRIPS = [
  { from: "Downtown", to: "Airport", status: "In Progress", eta: "12 min" },
  {
    from: "Central Park",
    to: "Tech Park",
    status: "Scheduled",
    eta: "6:40 PM",
  },
  { from: "West End", to: "City Mall", status: "Completed", eta: "Done" },
];

export default function TripsTabScreen() {
  return (
    <View className="flex-1 bg-white px-6 pt-16">
      <Text className="text-3xl font-black text-slate-900">Trips</Text>
      <Text className="mt-2 text-sm text-slate-500">
        A clean timeline of your recent and upcoming rides.
      </Text>

      <View className="mt-7 gap-3">
        {MOCK_TRIPS.map((trip) => (
          <View
            key={`${trip.from}-${trip.to}-${trip.status}`}
            className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-sky-600">
                {trip.status}
              </Text>
              <Text className="text-xs text-slate-500">{trip.eta}</Text>
            </View>
            <Text className="mt-3 text-base font-bold text-slate-900">
              {trip.from}
            </Text>
            <Text className="mt-1 text-sm text-slate-500">to {trip.to}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
