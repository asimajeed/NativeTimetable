import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Platform,
  TouchableOpacity,
  StatusBar,
  Linking,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as XLSX from "@e965/xlsx";
import { TimetableEntry } from "@/utils/types";
import { parseTimetable } from "@/utils/parseTimetable";
import AsyncStorage from "@react-native-async-storage/async-storage";
import "@/global.css";

export default function App() {
  const [file, setFile] = useState<null | DocumentPicker.DocumentPickerAsset>(null);
  const [searchTerms, setSearchTerms] = useState("");
  const [output, setOutput] = useState("");
  const [TimetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);

  // Load stored file path and timetable entries on app load
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        const storedFile = await AsyncStorage.getItem("filePath");
        const storedTimetable = await AsyncStorage.getItem("timetableEntries");

        if (storedTimetable) {
          setTimetableEntries(JSON.parse(storedTimetable));
        }
      } catch (error) {
        console.error("Error loading stored data", error);
      }
    };

    loadStoredData();
  }, []);

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        multiple: false,
      });

      if (!result.canceled) {
        const selectedFile = result.assets ? result.assets[0] : result; // Handle for web and native
        setFile(selectedFile);
        console.log(`File selected: ${selectedFile?.name}`);

      }
    } catch (error) {
      console.error("Error picking file: ", error);
    }
  };

  const handleParseFile = async (isFree = false) => {
    if (!file) {
      setOutput("Please upload a file");
      return;
    }

    try {
      const fileUri = file.uri;
      let terms: string[] | null = searchTerms.split(",").map((term) => term.trim());
      if (isFree) {
        terms = null;
      }

      let workbook: XLSX.WorkBook;

      if (Platform.OS === "web") {
        const response = await fetch(fileUri);
        const data = await response.arrayBuffer();
        workbook = XLSX.read(data, { type: "array" });
      } else {
        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        workbook = XLSX.read(fileContent, { type: "base64" });
      }

      const parsed = parseTimetable(workbook, terms);
      setTimetableEntries(parsed);

      // Store parsed timetable entries in AsyncStorage
      await AsyncStorage.setItem("timetableEntries", JSON.stringify(parsed));
    } catch (error) {
      console.error("Error parsing file: ", error);
      setOutput("Error processing the file. Please check the format.");
    }
  };

  return (
    <ScrollView className="flex-grow p-5 bg-gray-800">
      <StatusBar barStyle="light-content" backgroundColor="#1f2937" />
      <View className="p-5 border border-gray-700 rounded-lg bg-gray-700 shadow-lg">
        <Text className="text-lg font-bold mb-5 text-center text-blue-400">
          Timetable Search by{" "}
          <Text
            onPress={() => Linking.openURL("https://github.com/asimajeed")}
            className="bg-gradient-to-r from-blue-400 via-pink-500 to-red-800 bg-clip-text text-transparent underline decoration-red-800"
          >
            Asim
          </Text>
        </Text>
        <TouchableOpacity className="bg-blue-700 p-3 rounded-md my-2 items-center" onPress={handleFileUpload}>
          <Text className="text-white text-base">Upload File</Text>
        </TouchableOpacity>
        <Text className="text-base my-2 text-gray-300">Selected File: {file?.name || "None"}</Text>
        <TextInput
          placeholder="Search Terms (comma-separated)"
          placeholderTextColor="#9ca3af"
          value={searchTerms}
          onChangeText={setSearchTerms}
          className="border border-blue-950 p-3 rounded-md my-2 bg-gray-700 text-white"
        />
        <TouchableOpacity
          className="bg-blue-700 p-3 rounded-md my-2 items-center"
          onPress={() => handleParseFile()}
        >
          <Text className="text-white text-base">Search</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="bg-blue-700 p-3 rounded-md my-2 items-center"
          onPress={() => handleParseFile(true)}
        >
          <Text className="text-white text-base">Free Classes</Text>
        </TouchableOpacity>

        {TimetableEntries.length ? (
          Object.entries(
            TimetableEntries.reduce((groupedEntries: { [key: string]: TimetableEntry[] }, entry) => {
              const { day } = entry;
              if (!groupedEntries[day]) {
                groupedEntries[day] = [];
              }
              groupedEntries[day].push(entry);
              return groupedEntries;
            }, {})
          ).map(([day, entries]: [string, TimetableEntry[]]) => (
            <View key={day} className="my-5">
              <Text className="text-xl font-semibold mb-3 text-blue-300">{day}</Text>
              {entries.map(({ class_info: { course, time, venue } }: TimetableEntry, index: number) => (
                <View
                  key={index}
                  className="border border-gray-700 p-4 rounded-md mb-2 bg-gray-800 shadow-md"
                >
                  <Text className="text-lg font-bold text-white">{course}</Text>
                  <Text className="text-sm text-gray-400">{time}</Text>
                  <Text className="text-sm text-gray-400">{venue}</Text>
                </View>
              ))}
            </View>
          ))
        ) : (
          <>
            <Text className="text-center text-gray-100 mt-10">{output}</Text>
            <Text className="text-center text-gray-500 mt-2">No timetable entries found</Text>
          </>
        )}
      </View>
    </ScrollView>
  );
}
