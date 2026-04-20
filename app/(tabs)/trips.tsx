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
    <View className="flex-1 bg-slate-950 px-6 pt-16">
      <Text className="text-3xl font-black text-white">Trips</Text>
      <Text className="mt-2 text-sm text-slate-300">
        A clean timeline of your recent and upcoming rides.
      </Text>

      <View className="mt-7 gap-3">
        {MOCK_TRIPS.map((trip) => (
          <View
            key={`${trip.from}-${trip.to}-${trip.status}`}
            className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4"
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-cyan-300">
                {trip.status}
              </Text>
              <Text className="text-xs text-slate-400">{trip.eta}</Text>
            </View>
            <Text className="mt-3 text-base font-bold text-white">
              {trip.from}
            </Text>
            <Text className="mt-1 text-sm text-slate-400">to {trip.to}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
