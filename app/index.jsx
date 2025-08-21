import React, { useState } from "react";
import { View, Text, Button, Image, StyleSheet, ActivityIndicator, ScrollView, Alert, Modal, TouchableOpacity } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system"; 
import { MaterialIcons } from '@expo/vector-icons'; // Correct import for MaterialIcons

// A simple object to act as your local "database" for disease info
const DISEASE_INFO = {
  "Tomato___Early_blight": {
    symptoms: "Brown spots with concentric rings on lower leaves.",
    treatment: "Apply a copper-based fungicide. Remove and destroy infected leaves.",
  },
  "Apple___healthy": {
    symptoms: "No symptoms of disease. The plant is healthy.",
    treatment: "Continue standard care.",
  },
  "Corn___Common_rust": {
    symptoms: "Small, raised, cinnamon-brown pustules on leaves.",
    treatment: "Use resistant corn varieties and apply fungicides if necessary.",
  },
  "Pepper_bell___Bacterial_spot": {
    symptoms: "Small, water-soaked spots on leaves and fruit. Leaves may turn yellow and drop.",
    treatment: "Use disease-free seeds and transplants. Apply copper-based bactericides.",
  },
  "Pepper_bell___healthy": {
    symptoms: "No symptoms of disease. The plant is healthy.",
    treatment: "Continue standard care.",
  },
  "Potato___Early_blight": {
    symptoms: "Dark brown to black spots with concentric rings on lower leaves.",
    treatment: "Rotate crops. Apply fungicides when symptoms appear.",
  },
  "Potato___healthy": {
    symptoms: "No symptoms of disease. The plant is healthy.",
    treatment: "Continue standard care.",
  },
  "Potato___Late_blight": {
    symptoms: "Irregular, dark-brown or black lesions on leaves and stems.",
    treatment: "Spray with fungicides regularly, ensure proper air circulation.",
  },
  "Tomato___Target_Spot": {
    symptoms: "Small, brown spots with a yellow halo, often with a central dot.",
    treatment: "Improve air circulation. Apply fungicides as needed.",
  },
  "Tomato___Tomato_mosaic_virus": {
    symptoms: "Mottling, curling, or distortion of leaves. Stunted plant growth.",
    treatment: "Remove and destroy infected plants. Use virus-free seeds.",
  },
  "Tomato___Tomato_Yellow_Leaf_Curl_Virus": {
    symptoms: "Yellowing, upward curling of leaves. Stunted plant growth.",
    treatment: "Control whiteflies, the primary vector. Remove infected plants.",
  },
  "Tomato___Bacterial_spot": {
    symptoms: "Small, dark, greasy spots on leaves and fruit. Leaf drop may occur.",
    treatment: "Use resistant varieties. Apply copper-based bactericides.",
  },
  "Tomato___healthy": {
    symptoms: "No symptoms of disease. The plant is healthy.",
    treatment: "Continue standard care.",
  },
  "Tomato___Late_blight": {
    symptoms: "Irregular, dark-brown to purple lesions on leaves and fruit. White mold may appear.",
    treatment: "Apply fungicides. Ensure proper spacing and air circulation.",
  },
  "Tomato___Leaf_Mold": {
    symptoms: "Yellowish spots on the top of leaves with olive-green or brown mold on the underside.",
    treatment: "Improve air circulation. Avoid overhead watering.",
  },
  "Tomato___Septoria_leaf_spot": {
    symptoms: "Small, circular spots with dark brown margins and a gray center on lower leaves.",
    treatment: "Remove infected leaves. Apply fungicides.",
  },
  "Tomato___Spider_mites_Two-spotted_spider_mite": {
    symptoms: "Tiny yellow or white spots on leaves. Fine webbing on the underside of leaves.",
    treatment: "Spray with insecticidal soap or horticultural oil.",
  },
  "Unrecognized": {
    symptoms: "The image does not clearly match any known plant diseases. Please try a clearer picture of a single leaf.",
    treatment: "Please ensure the image is a plant and is well-lit with a plain background. Re-upload for analysis."
  }
};

export default function App() {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Pick from gallery with Base64 conversion
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setResult(null);
      setModalVisible(false);
    }
  };

  // Capture with camera with Base64 conversion
  const takePhoto = async () => {
    let result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
      base64: true,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setResult(null);
      setModalVisible(false);
    }
  };

  // Send image to Roboflow Workflow
  const analyzeImage = async () => {
    if (!image) {
      Alert.alert("No Image Selected", "Please select an image before analyzing.");
      return;
    }
    setLoading(true);
    setResult(null);

    try {
      const base64Image = await FileSystem.readAsStringAsync(image, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const response = await fetch("https://serverless.roboflow.com/infer/workflows/cropcare-0gpsu/custom-workflow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: "QqOMN4Su3zUHUW4Ocxzq", // Make sure to replace this with your actual key
          inputs: {
            image: { type: "base64", value: base64Image },
          },
        }),
      });

      const data = await response.json();

      console.log(data);

      const predictions = data?.outputs?.[0]?.predictions?.predictions;

      console.log(predictions)
      
      let diseaseName;
      let confidence = 0;
      let info;
      
      const CONFIDENCE_THRESHOLD = 0.5;

      if (predictions && predictions.length > 0) {
        const highestConfidencePrediction = predictions.reduce((prev, current) =>
          (prev.confidence > current.confidence) ? prev : current
        );

        confidence = highestConfidencePrediction.confidence;
        
        if (confidence > CONFIDENCE_THRESHOLD) {
          diseaseName = highestConfidencePrediction.class;
          info = DISEASE_INFO[diseaseName] || DISEASE_INFO.Unrecognized;
        } else {
          diseaseName = "Unrecognized Image ⚠️";
          info = DISEASE_INFO.Unrecognized;
        }
      } else {
          diseaseName = "Unrecognized Image ⚠️";
          info = DISEASE_INFO.Unrecognized;
      }

      setResult({
        disease: diseaseName,
        confidence: confidence,
        symptoms: info.symptoms,
        treatment: info.treatment,
      });

      setModalVisible(true);

    } catch (error) {
      console.error("Error during analysis:", error);
      Alert.alert("Analysis Failed", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {image && <Image source={{ uri: image }} style={styles.image} />}
      <View style={styles.cardContainer}>
        <Text style={styles.header}>Heal your crop</Text>
        <View style={styles.card}>
          <View style={styles.stepContainer}>
            <View style={styles.step}>
              <Image source={require('../assets/images/leaf_icon.png')} style={styles.icon} />
              <Text style={styles.stepText}>Take a picture</Text>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={24} color="#C0C0C0" style={styles.arrow} />
            <View style={styles.step}>
              <Image source={require('../assets/images/phone_icon.png')} style={styles.icon} />
              <Text style={styles.stepText}>See diagnosis</Text>
            </View>
            <MaterialIcons name="arrow-forward-ios" size={24} color="#C0C0C0" style={styles.arrow} />
            <View style={styles.step}>
              <Image source={require('../assets/images/medicine_icon.png')} style={styles.icon} />
              <Text style={styles.stepText}>Get medicine</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.buttons}>
        <Button title="📂 Upload Image" onPress={pickImage} color="#6a8e32" />
        <Button title="📸 Take Photo" onPress={takePhoto} color="#6a8e32" />
      </View>

      {image && !loading && (
        <Button title="🔍 Analyze" onPress={analyzeImage} color="#387a20" />
      )}

      {loading && <ActivityIndicator size="large" color="#387a20" style={styles.loader} />}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            {image && <Image source={{ uri: image }} style={styles.image} />}
            <View>
              <Text style={styles.modalTitle}>🧾 Analysis Result</Text>
              <Text style={styles.resultText}>**Disease:** {result?.disease}</Text>
              <Text style={styles.resultText}>**Confidence:** {Math.round(result?.confidence * 100)}%</Text>
              <Text style={styles.resultText}>**Symptoms:** {result?.symptoms}</Text>
              <Text style={styles.resultText}>**Solution:** {result?.treatment}</Text>
            </View>
            <TouchableOpacity
              style={styles.modelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closebtn}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#e8f5e9",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#387a20",
  },
  image: {
    width: 300,
    height: 300,
    marginVertical: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#a5d6a7",
  },
  buttons: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 15,
  },
  loader: {
    marginTop: 20,
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#387a20",
  },
  modelButton: {
    width: "100%",
    backgroundColor: "#d1431cff",
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 5,
  },
  resultText: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  closebtn: {
    color: "#fff",
  },
  cardContainer: {
    marginVertical: 10,
    width: '100%',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: "#6a8e32",
  },
  card: {
    backgroundColor: '#F5F5F5',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: "#7ec60aff",
  },
  stepContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  step: {
    alignItems: 'center',
  },
  icon: {
    width: 60,
    height: 60,
    marginBottom: 5,
  },
  stepText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#333',
  },
  arrow: {
    alignSelf: 'center',
    marginHorizontal: 5,
  },
  button: {
    backgroundColor: '#007BFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});