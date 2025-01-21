import * as XLSX from "@e965/xlsx";
import { TimetableEntry } from "./types";

export const parseTimetable = (workbook: XLSX.WorkBook, terms: string[] | null) => {
  const timetableEntries: TimetableEntry[] = [];

  workbook.SheetNames.slice(0, 5).forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet["!ref"] || "");

    const day = sheetName; // Use the sheet name as the day

    for (let colIndex = 1; colIndex <= range.e.c; colIndex++) {
      const timeSlotCell = sheet[XLSX.utils.encode_cell({ r: 2, c: colIndex })]; // Row 3
      const timeSlot = timeSlotCell ? String(timeSlotCell.v) : "";

      for (let rowIndex = 5; rowIndex <= range.e.r; rowIndex++) {
        const venueCell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: 0 })]; // Column A
        const venue = venueCell ? venueCell.v : null;

        if (venue) {
          const cell = sheet[XLSX.utils.encode_cell({ r: rowIndex, c: colIndex })];
          const cellValue = cell ? String(cell.v) : "";

          if (terms === null) {
            if (cellValue === "") {
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
          } else if (terms.some((term) => cellValue.includes(term))) {
            const isLab = cellValue.toLowerCase().includes("lab");

            if (isLab) {
              const startTime = timeSlot.split("-")[0];
              const endTime =
                colIndex + 2 <= range.e.c
                  ? String(sheet[XLSX.utils.encode_cell({ r: 2, c: colIndex + 2 })]?.v).split("-")[1]
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
      }
    }
  });

  return timetableEntries;
};
