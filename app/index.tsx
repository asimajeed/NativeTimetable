import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Button,
  Platform,
  TouchableOpacity,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import ExcelJS from "exceljs";
import { TimetableEntry } from "@/utils/types";

const parseTimetable = (workbook: ExcelJS.Workbook, terms: string[]) => {
  const timetableEntries: TimetableEntry[] = [];

  workbook.worksheets.slice(0, 5).forEach((sheet, sheetIndex) => {
    const day = sheet.name;
    sheet.eachRow((row, rowIndex) => {
      if (rowIndex > 4) {
        const venue = sheet.getRow(rowIndex).getCell(1).value; // Column A

        if (venue) {
          row.eachCell((cell, colIndex) => {
            if (colIndex >= 2) {
              const cellValue = cell.value?.toString() || "";
              if (terms.some((term) => cellValue.includes(term))) {
                const timeSlot = String(sheet.getRow(3).getCell(colIndex).value); // Row 3
                const isLab = cellValue.toLowerCase().includes("lab");

                if (isLab) {
                  const startTime = String(sheet.getRow(3).getCell(colIndex).value || "").split(
                    "-"
                  )[0];
                  const endTime =
                    colIndex + 2 <= sheet.columnCount
                      ? String(sheet.getRow(3).getCell(colIndex + 2).value || "").split("-")[1]
                      : "Unknown";

                  timetableEntries.push({
                    day,
                    class_info: {
                      venue: String(venue).trim(),
                      time: `${startTime} - ${endTime}`,
                      course: cellValue.replace("\n", " "),
                    },
                  });
                } else {
                  const time = `${timeSlot.split("-")[0]} - ${timeSlot.split("-")[1]}`.trim();
                  timetableEntries.push({
                    day,
                    class_info: {
                      venue: String(venue).trim(),
                      time,
                      course: cellValue.replace("\n", " "),
                    },
                  });
                }
              }
            }
          });
        }
      }
    });
  });

  return timetableEntries;
};

export default function App() {
  const [file, setFile] = useState<null | DocumentPicker.DocumentPickerAsset>(null);
  const [searchTerms, setSearchTerms] = useState("");
  const [output, setOutput] = useState("");
  const [TimetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const handleFileUpload = async () => {
    try {
      let result = await DocumentPicker.getDocumentAsync({
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        multiple: false,
      });
      console.log(result);
      if (!result.canceled) {
        result = result as DocumentPicker.DocumentPickerSuccessResult;
        setFile(result.assets[0]);
        console.log(`File selected: ${file?.name}`);
      }
    } catch (error) {
      console.error("Error picking file: ", error);
    }
  };

  const handleParseFile = async () => {
    if (!file || !searchTerms.trim()) {
      setOutput("Please upload a file and enter search terms.");
      return;
    }

    try {
      const fileUri = file.uri;
      const terms = searchTerms.split(",").map((term) => term.trim());

      const workbook = new ExcelJS.Workbook();

      if (Platform.OS === "web") {
        const data = await (file.file as File).arrayBuffer();
        await workbook.xlsx.load(data);
      } else {
        await workbook.xlsx.readFile(fileUri);
      }
      const parsed = parseTimetable(workbook, terms);
      setTimetableEntries(parsed);
      setOutput(JSON.stringify(parsed, null, 2));
    } catch (error) {
      console.error("Error parsing file: ", error);
      setOutput("Error processing the file. Please check the format.");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Timetable Search</Text>
        <TouchableOpacity style={styles.button} onPress={handleFileUpload}>
          <Text style={styles.buttonText}>Upload File</Text>
        </TouchableOpacity>
        <TextInput
          placeholder="Search Terms (comma-separated)"
          value={searchTerms}
          onChangeText={setSearchTerms}
          style={styles.input}
        />
        <TouchableOpacity style={styles.button} onPress={handleParseFile}>
          <Text style={styles.buttonText}>Search</Text>
        </TouchableOpacity>
        {output ? (
          <ScrollView style={styles.output}>
            {TimetableEntries.length ? (
              TimetableEntries.map((entry, index) => (
                <Text key={index} style={styles.outputText}>
                  {JSON.stringify(entry, null, 2)}
                </Text>
              ))
            ) : (
              <Text>No results found.</Text>
            )}
          </ScrollView>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#000000",
  },
  card: {
    padding: 20,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#007bff",
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 5,
    marginVertical: 10,
  },
  output: {
    marginTop: 20,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
  },
  outputText: {
    fontSize: 14,
    fontFamily: "monospace",
  },
});
