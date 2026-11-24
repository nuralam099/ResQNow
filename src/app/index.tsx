import * as Location from "expo-location";
import { useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function HomeScreen() {

const [selectedService, setSelectedService] = useState("");

const [location, setLocation] =
  useState<Location.LocationObjectCoords | null>(null);

const [isLocating, setIsLocating] = useState(false);

const [nearbyPlaces, setNearbyPlaces] = useState<any[]>([]);

const [isSearching, setIsSearching] = useState(false);

const services = [
    {
      id: "hospital",
      name: "Hospital",
      icon: "🏥",
      color: "#E53945",
      description: "Find nearby hospitals",
    },
    {
      id: "police",
      name: "Police",
      icon: "👮",
      color: "#2878D0",
      description: "Find nearby police stations",
    },
    {
      id: "fire",
      name: "Fire Service",
      icon: "🚒",
      color: "#F28C28",
      description: "Find nearby fire stations",
    },
  ];

  
const handleServicePress = (service: string) => {
  setSelectedService(service);

  if (service === "Hospital") {
    searchNearbyHospitals();
    return;
  }

  if (service === "Police") {
    searchNearbyPolice();
    return;
  }

  if (service === "Fire Service") {
    searchNearbyFireStations();
    return;
  }

  Alert.alert(
    service,
    "Nearby search will be available in the next development step."
  );
};

 
const handleLocationPress = async () => {
  try {
    setIsLocating(true);

    const { status } =
      await Location.requestForegroundPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Please allow location permission to detect your location."
      );
      return;
    }

    const currentLocation =
      await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

    setLocation(currentLocation.coords);

    Alert.alert(
      "Location Detected!",
      `Latitude: ${currentLocation.coords.latitude}\nLongitude: ${currentLocation.coords.longitude}`
    );

  } catch (error) {
    Alert.alert(
      "Location Error",
      "Unable to detect your current location. Please try again."
    );
  } finally {
    setIsLocating(false);
  }
};



const OVERPASS_SERVERS = [
  "https://overpass.private.coffee/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];



// Search Nearby Hospitals
const searchNearbyHospitals = async () => {
  if (!location) {
    Alert.alert(
      "Location Required",
      "Please detect your current location first."
    );
    return;
  }

  try {
    setIsSearching(true);
    setNearbyPlaces([]);

    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="hospital"](around:5000,${location.latitude},${location.longitude});
        way["amenity"="hospital"](around:5000,${location.latitude},${location.longitude});
        relation["amenity"="hospital"](around:5000,${location.latitude},${location.longitude});
      );
      out center;
    `;

   
let response: Response | null = null;

for (const server of OVERPASS_SERVERS) {
  try {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, 30000);

    try {
      response = await fetch(server, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "data=" + encodeURIComponent(query),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (response.ok) {
      break;
    }

    console.log(
      "Server failed:",
      server,
      response.status
    );

    response = null;

  } catch (error) {
    console.log("Server unavailable:", server, error);
    response = null;
  }
}

if (!response) {
  throw new Error(
    "All OpenStreetMap servers are unavailable. Please try again."
  );
}


   if (!response.ok) {
  const errorText = await response.text();

  throw new Error(
    `Server Error: ${response.status} - ${errorText.slice(0, 200)}`
  );
}

    const data = await response.json();

    
const hospitals = data.elements
  .map((item: any) => ({
    id: item.id,
    name: item.tags?.name || "Unnamed Hospital",

    phone:
      item.tags?.phone ||
      item.tags?.["contact:phone"] ||
      item.tags?.["phone:mobile"] ||
      "Phone number not available",

    latitude: item.lat ?? item.center?.lat,
    longitude: item.lon ?? item.center?.lon,
  }))
  .filter(
    (item: any) =>
      item.latitude != null &&
      item.longitude != null
  );

    setNearbyPlaces(sortByDistance(hospitals));

    Alert.alert(
      "Hospital Search",
      hospitals.length > 0
        ? `Found ${hospitals.length} nearby hospitals!`
        : "No hospitals found within 5 KM."
    );

  } catch (error) {
  console.log("Hospital Search Error:", error);

  Alert.alert(
    "Search Error",
    error instanceof Error
      ? error.message
      : String(error)
  );
}
 finally {
    setIsSearching(false);
  }
};

// Search Nearby Police Stations
const searchNearbyPolice = async () => {
  if (!location) {
    Alert.alert(
      "Location Required",
      "Please detect your current location first."
    );
    return;
  }

  try {
    setIsSearching(true);
    setNearbyPlaces([]);

    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="police"](around:5000,${location.latitude},${location.longitude});
        way["amenity"="police"](around:5000,${location.latitude},${location.longitude});
        relation["amenity"="police"](around:5000,${location.latitude},${location.longitude});
      );
      out center;
    `;

    let response: Response | null = null;

    for (const server of OVERPASS_SERVERS) {
      try {
        response = await fetch(server, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "data=" + encodeURIComponent(query),
        });

        if (response.ok) break;

        response = null;
      } catch (error) {
        console.log("Police server error:", error);
        response = null;
      }
    }

    if (!response) {
      throw new Error("Police search servers are unavailable.");
    }

    const data = await response.json();

    const policeStations = data.elements
      .map((item: any) => ({
        id: item.id,
        name: item.tags?.name || "Unnamed Police Station",

        phone:
          item.tags?.phone ||
          item.tags?.["contact:phone"] ||
          item.tags?.["phone:mobile"] ||
          "Phone number not available",

        latitude: item.lat ?? item.center?.lat,
        longitude: item.lon ?? item.center?.lon,
      }))
      .filter(
        (item: any) =>
          item.latitude != null &&
          item.longitude != null
      );

    setNearbyPlaces(sortByDistance(policeStations));

    Alert.alert(
      "Police Search",
      policeStations.length > 0
        ? `Found ${policeStations.length} nearby police stations!`
        : "No police stations found within 5 KM."
    );

  } catch (error) {
    Alert.alert(
      "Search Error",
      error instanceof Error ? error.message : String(error)
    );
  } finally {
    setIsSearching(false);
  }
};


// Search Nearby Fire Stations
const searchNearbyFireStations = async () => {
  if (!location) {
    Alert.alert(
      "Location Required",
      "Please detect your current location first."
    );
    return;
  }

  try {
    setIsSearching(true);
    setNearbyPlaces([]);

    const query = `
      [out:json][timeout:25];
      (
       node["amenity"="fire_station"](around:10000,${location.latitude},${location.longitude});
        way["amenity"="fire_station"](around:10000,${location.latitude},${location.longitude});
        relation["amenity"="fire_station"](around:10000,${location.latitude},${location.longitude});
      );
      out center;
    `;

    let response: Response | null = null;

    for (const server of OVERPASS_SERVERS) {
      try {
        response = await fetch(server, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "data=" + encodeURIComponent(query),
        });

        if (response.ok) break;

        response = null;
      } catch (error) {
        console.log("Fire Station server error:", error);
        response = null;
      }
    }

    if (!response) {
      throw new Error("Fire Service search servers are unavailable.");
    }

    const data = await response.json();

    const fireStations = data.elements
      .map((item: any) => ({
        id: item.id,
        name: item.tags?.name || "Unnamed Fire Station",

        phone:
          item.tags?.phone ||
          item.tags?.["contact:phone"] ||
          item.tags?.["phone:mobile"] ||
          "Phone number not available",

        latitude: item.lat ?? item.center?.lat,
        longitude: item.lon ?? item.center?.lon,
      }))
      .filter(
        (item: any) =>
          item.latitude != null &&
          item.longitude != null
      );

    setNearbyPlaces(sortByDistance(fireStations));

    Alert.alert(
      "Fire Service Search",
      fireStations.length > 0
        ? `Found ${fireStations.length} nearby fire stations!`
        : "No fire stations found within 5 KM."
    );

  } catch (error) {
    Alert.alert(
      "Search Error",
      error instanceof Error ? error.message : String(error)
    );
  } finally {
    setIsSearching(false);
  }
};


// Calculate Distance Between Two Locations
const calculateDistance = (
  lat: number,
  lon: number
) => {
  if (!location) return 0;

  const R = 6371;

  const dLat =
    ((lat - location.latitude) * Math.PI) / 180;

  const dLon =
    ((lon - location.longitude) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((location.latitude * Math.PI) / 180) *
      Math.cos((lat * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};
const sortByDistance = (places: any[]) => {
  return [...places].sort((a, b) => {
    const distanceA = calculateDistance(
      a.latitude,
      a.longitude
    );

    const distanceB = calculateDistance(
      b.latitude,
      b.longitude
    );

    return distanceA - distanceB;
  });
};
  
  return (
    <View style={styles.container}>
      <StatusBar
        backgroundColor="#F5F8FF"
        barStyle="dark-content"
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        
<View style={styles.header}>
  <View style={styles.logo}>
    <Text style={styles.logoIcon}>🚨</Text>
  </View>

  <View style={styles.headerText}>
    <Text style={styles.appName}>ResQNow</Text>
    <Text style={styles.tagline}>
      EMERGENCY ASSISTANCE PLATFORM
    </Text>
  </View>

  <View style={styles.headerBadge}>
    <Text style={styles.headerBadgeText}>BD</Text>
  </View>
</View>


       
{/* Welcome Section */}
<View style={styles.welcomeSection}>
  <Text style={styles.welcomeBadge}>
    YOUR SAFETY MATTERS
  </Text>

  <Text style={styles.welcomeTitle}>
    Find Emergency{"\n"}
    <Text style={{ color: "#2878D0" }}>
      Services Near You
    </Text>
  </Text>

  <Text style={styles.welcomeDescription}>
    Quickly locate nearby hospitals, police stations
    and fire services whenever you need help.
  </Text>
</View>


       
{/* Location Card */}
<Pressable
  style={styles.locationCard}
  onPress={handleLocationPress}
  disabled={isLocating}
>
  <View style={styles.locationIcon}>
    <Text style={{ fontSize: 27 }}>📍</Text>
  </View>

  <View style={styles.locationText}>
    <Text style={styles.locationTitle}>
      {location ? "Location Detected" : "Detect Your Location"}
    </Text>

    <Text style={styles.locationDescription}>
      {isLocating
        ? "Detecting your current location..."
        : location
        ? "Your current location is ready"
        : "Tap here to find emergency services nearby"}
    </Text>
  </View>

  <View style={styles.locationAction}>
    <Text style={styles.locationActionText}>
      {isLocating ? "..." : location ? "✓" : "→"}
    </Text>
  </View>
</Pressable>

        {/* Emergency Services */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Emergency Services
          </Text>

          <Text style={styles.sectionDescription}>
            Select a service to find nearby facilities.
          </Text>

         
{services.map((service) => (
  <Pressable
    key={service.id}
    style={[
      styles.serviceCard,
      selectedService === service.name &&
        styles.selectedCard,
    ]}
    onPress={() => handleServicePress(service.name)}
  >
    <View
      style={[
        styles.serviceIcon,
        { backgroundColor: service.color + "18" },
      ]}
    >
      <Text style={styles.serviceEmoji}>
        {service.icon}
      </Text>
    </View>

    <View style={styles.serviceInfo}>
      <Text style={styles.serviceName}>
        {service.name}
      </Text>

      <Text style={styles.serviceDescription}>
        {service.description}
      </Text>
    </View>

    <View style={styles.serviceArrowBox}>
      <Text style={styles.serviceArrow}>›</Text>
    </View>
  </Pressable>
))}


          {/* Hospital Search Results */}

          {isSearching && (
            <Text style={styles.sectionDescription}>
              Searching nearby {
  selectedService === "Police"
    ? "police stations"
    : selectedService === "Fire Service"
    ? "fire stations"
    : "hospitals"
}...
            </Text>
          )}

          {!isSearching && nearbyPlaces.length > 0 && (
            <View style={{ marginTop: 15 }}>
              <Text style={styles.sectionTitle}>
  Nearby {
  selectedService === "Police"
    ? "Police Stations"
    : selectedService === "Fire Service"
    ? "Fire Stations"
    : "Hospitals"
} ({nearbyPlaces.length})
</Text>

             
{nearbyPlaces.map((hospital) => (
  <View key={hospital.id} style={styles.resultCard}>
    <View style={styles.resultIcon}>
      <Text style={{ fontSize: 27 }}>
        {selectedService === "Police"
          ? "👮"
          : selectedService === "Fire Service"
          ? "🚒"
          : "🏥"}
      </Text>
    </View>

    <View style={styles.resultInfo}>
      <Text style={styles.resultName}>
        {hospital.name}
      </Text>

      <Pressable
        onPress={() => {
          if (hospital.phone === "Phone number not available") {
            Alert.alert(
              "Phone Number Unavailable",
              "This facility does not have a phone number."
            );
            return;
          }

          Linking.openURL(`tel:${hospital.phone}`).catch(() => {
            Alert.alert(
              "Call Error",
              "Unable to open the phone dialer."
            );
          });
        }}
      >
        <Text style={styles.resultPhone}>
          📞 {hospital.phone}
        </Text>
      </Pressable>

      <View style={styles.distanceBadge}>
        <Text style={styles.distanceText}>
          📍 Distance: {calculateDistance(
            hospital.latitude,
            hospital.longitude
          ).toFixed(2)} KM away
        </Text>
      </View>
    </View>
  </View>
))}

              </View>
            )}
          </View>


        {/* Emergency Notice */}
        <View style={styles.noticeCard}>
          <Text style={styles.noticeIcon}>ℹ️</Text>

          <View style={styles.noticeText}>
            <Text style={styles.noticeTitle}>
              Emergency Information
            </Text>

            <Text style={styles.noticeDescription}>
              Facility information depends on available
              map data and internet connectivity.
            </Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          ResQNow © 2026
        </Text>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8FF",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 22,
    paddingTop: 25,
    paddingBottom: 20,
  },

  logo: {
    width: 55,
    height: 55,
    borderRadius: 16,
    backgroundColor: "#DCE9FF",
    justifyContent: "center",
    alignItems: "center",
  },

  logoIcon: {
    fontSize: 30,
  },

  headerText: {
    marginLeft: 12,
  },

  appName: {
    fontSize: 21,
    fontWeight: "bold",
    color: "#173B70",
  },

  tagline: {
    fontSize: 10,
    color: "#71829B",
    marginTop: 4,
    letterSpacing: 1,
  },

  headerBadge: {
  backgroundColor: "#E4EEFF",
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 10,
},

headerBadgeText: {
  color: "#2878D0",
  fontSize: 12,
  fontWeight: "bold",
},

 
welcomeSection: {
  paddingHorizontal: 22,
  marginTop: 22,
  marginBottom: 25,
},

welcomeBadge: {
  color: "#2878D0",
  fontSize: 10,
  fontWeight: "bold",
  letterSpacing: 1.5,
  marginBottom: 10,
},

welcomeTitle: {
  fontSize: 27,
  fontWeight: "bold",
  color: "#172D50",
  lineHeight: 35,
},

welcomeDescription: {
  fontSize: 13,
  color: "#71809A",
  marginTop: 10,
  lineHeight: 21,
},


 
locationCard: {
  marginHorizontal: 20,
  padding: 17,
  backgroundColor: "#E4EEFF",
  borderRadius: 18,
  flexDirection: "row",
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#D4E3FA",
},

locationIcon: {
  width: 52,
  height: 52,
  backgroundColor: "#FFFFFF",
  borderRadius: 15,
  justifyContent: "center",
  alignItems: "center",
},

locationText: {
  flex: 1,
  marginLeft: 13,
},

locationTitle: {
  fontSize: 15,
  fontWeight: "bold",
  color: "#173B70",
},

locationDescription: {
  fontSize: 11,
  color: "#637895",
  marginTop: 6,
  lineHeight: 17,
},

locationAction: {
  width: 34,
  height: 34,
  backgroundColor: "#2878D0",
  borderRadius: 11,
  justifyContent: "center",
  alignItems: "center",
},

locationActionText: {
  fontSize: 19,
  fontWeight: "bold",
  color: "#FFFFFF",
},

  arrow: {
    fontSize: 28,
    color: "#2878D0",
  },

  section: {
    paddingHorizontal: 20,
    marginTop: 30,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#172D50",
  },

  sectionDescription: {
    fontSize: 13,
    color: "#71809A",
    marginTop: 6,
    marginBottom: 15,
  },

 
serviceCard: {
  backgroundColor: "#FFFFFF",
  marginHorizontal: 20,
  marginBottom: 14,
  padding: 17,
  borderRadius: 18,
  flexDirection: "row",
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#E8EEF6",
  elevation: 3,
  shadowColor: "#173B70",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.07,
  shadowRadius: 8,
},

selectedCard: {
  borderColor: "#2878D0",
  backgroundColor: "#F5F9FF",
  borderWidth: 1.5,
},

serviceIcon: {
  width: 56,
  height: 56,
  borderRadius: 16,
  justifyContent: "center",
  alignItems: "center",
},

serviceEmoji: {
  fontSize: 29,
},

serviceInfo: {
  flex: 1,
  marginLeft: 15,
},

serviceName: {
  fontSize: 16,
  fontWeight: "bold",
  color: "#173B70",
},

serviceDescription: {
  fontSize: 12,
  color: "#71809A",
  marginTop: 5,
  lineHeight: 18,
},

serviceArrowBox: {
  width: 32,
  height: 32,
  borderRadius: 11,
  backgroundColor: "#EAF2FF",
  justifyContent: "center",
  alignItems: "center",
},

serviceArrow: {
  fontSize: 25,
  color: "#2878D0",
  fontWeight: "bold",
},


resultCard: {
  backgroundColor: "#FFFFFF",
  marginHorizontal: 20,
  marginBottom: 14,
  padding: 16,
  borderRadius: 18,
  flexDirection: "row",
  alignItems: "flex-start",
  borderWidth: 1,
  borderColor: "#E8EEF6",
  elevation: 3,
  shadowColor: "#173B70",
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.07,
  shadowRadius: 8,
},

resultIcon: {
  width: 52,
  height: 52,
  borderRadius: 15,
  backgroundColor: "#EAF2FF",
  justifyContent: "center",
  alignItems: "center",
},

resultInfo: {
  flex: 1,
  marginLeft: 13,
},

resultName: {
  fontSize: 15,
  fontWeight: "bold",
  color: "#173B70",
  lineHeight: 21,
},

resultPhone: {
  fontSize: 12,
  color: "#2878D0",
  fontWeight: "bold",
  marginTop: 9,
},

distanceBadge: {
  alignSelf: "flex-start",
  backgroundColor: "#F0F5FC",
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 8,
  marginTop: 9,
},

distanceText: {
  fontSize: 11,
  color: "#637895",
  fontWeight: "600",
},

  noticeCard: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 15,
    backgroundColor: "#FFF5E5",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "flex-start",
  },

  noticeIcon: {
    fontSize: 20,
  },

  noticeText: {
    flex: 1,
    marginLeft: 10,
  },

  noticeTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#885C1C",
  },

  noticeDescription: {
    fontSize: 11,
    color: "#987544",
    lineHeight: 18,
    marginTop: 5,
  },

  footer: {
    textAlign: "center",
    color: "#9AA7B8",
    fontSize: 11,
    marginTop: 25,
    marginBottom: 25,
  },
});