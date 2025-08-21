import { Stack } from "expo-router";
import { View, StyleSheet, Image } from "react-native";


export default function RootLayout() {

  return( 
    <Stack>
      <Stack.Screen name="index" options={{
        title: "CropCare",
      }}/>
    </Stack>
  );

}



const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerImage: {
    width: 24, // Adjust size as needed
    height: 24,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});