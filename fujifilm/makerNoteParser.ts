// MakerNote tag IDs and values referenced from:
// - github.com/exiftool/exiftool/blob/master/lib/Image/ExifTool/FujiFilm.pm
// - exiftool.org/TagNames/FujiFilm.html

import type { ExifData } from "ts-exif-parser";
import { WeakStrong } from "./recipe";

export const MAKE_FUJIFILM = "FUJIFILM";

export const isExifForFujifilm = (data: ExifData) =>
  data.tags?.Make?.toLocaleUpperCase() === MAKE_FUJIFILM;

// Makernote Offsets
const BYTE_OFFSET_TAG_COUNT = 12;
const BYTE_OFFSET_FIRST_TAG = 14;

// Tag Offsets
const BYTE_OFFSET_TAG_TYPE = 2;
const BYTE_OFFSET_TAG_SIZE = 4;
const BYTE_OFFSET_TAG_VALUE = 8;

// Tag Sizes
const BYTES_PER_TAG = 12;
const BYTES_PER_TAG_VALUE = 4;

// TIFF data types and their sizes
// const TIFF_TYPES: Record<number, { name: string; size: number }> = {
//   1: { name: "BYTE", size: 1 },
//   2: { name: "ASCII", size: 1 },
//   3: { name: "SHORT", size: 2 },
//   4: { name: "LONG", size: 4 },
//   5: { name: "RATIONAL", size: 8 },
//   7: { name: "UNDEFINED", size: 1 },
//   9: { name: "SLONG", size: 4 },
//   10: { name: "SRATIONAL", size: 8 },
// };

type TagValueMap = { [key: number]: string };

export interface TagInfo {
  name: string;
  description: string;
  values?: TagValueMap;
}

export interface TagEntry {
  tagId: string;
  name: string;
  description: string;
  dataType: string;
  count: number;
  value: string | number | Array<number | string>;
}

function readString(data: Uint8Array, offset: number, length: number): string {
  const bytes = data.slice(offset, offset + length);
  return new TextDecoder().decode(bytes).replace(/\0/g, "");
}

// function readUint16(view: DataView, offset: number): number {
//   return view.getUint16(offset, true);
// }

// function readUint32(view: DataView, offset: number): number {
//   return view.getUint32(offset, true);
// }

export function parseFujifilmMakerNote(
  buffer: ArrayBuffer | Uint8Array,
  sendTagNumbers: (tagId: number, numbers: number[]) => void
) {
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

  const signature = readString(data, 0, 8);
  if (signature !== "FUJIFILM") {
    throw new Error("Invalid Fujifilm MakerNote signature: " + signature);
  }

  const tagCount = view.getUint16(BYTE_OFFSET_TAG_COUNT, true);

  for (let i = 0; i < tagCount; i++) {
    const index = BYTE_OFFSET_FIRST_TAG + i * BYTES_PER_TAG;

    if (index + BYTES_PER_TAG < data.length) {
      const tagId = view.getUint16(index, true);
      const tagType = view.getUint16(index + BYTE_OFFSET_TAG_TYPE, true);
      const tagValueSize = view.getUint16(index + BYTE_OFFSET_TAG_SIZE, true);

      const sendNumbersForDataType = (
        parseNumberAtOffset: (offset: number) => number,
        sizeInBytes: number
      ) => {
        let values: number[] = [];
        if (tagValueSize * sizeInBytes <= BYTES_PER_TAG_VALUE) {
          // Retrieve values if they fit in tag block
          values = Array.from({ length: tagValueSize }, (_, i) =>
            parseNumberAtOffset(index + BYTE_OFFSET_TAG_VALUE + i * sizeInBytes)
          );
        } else {
          // Retrieve outside values if they don't fit in tag block
          const offset = view.getUint16(index + BYTE_OFFSET_TAG_VALUE, true);
          for (let i = 0; i < tagValueSize; i++) {
            values.push(parseNumberAtOffset(offset + i * sizeInBytes));
          }
        }
        sendTagNumbers(tagId, values);
      };

      switch (tagType) {
        // Int8 (UInt8 read as Int8 according to spec)
        case 1:
          sendNumbersForDataType((offset) => view.getInt8(offset), 1);
          break;
        // UInt16
        case 3:
          sendNumbersForDataType((offset) => view.getUint16(offset, true), 2);
          break;
        // UInt32
        case 4:
          sendNumbersForDataType((offset) => view.getUint32(offset, true), 4);
          break;
        // Int32
        case 9:
          sendNumbersForDataType((offset) => view.getInt32(offset, true), 4);
          break;
      }
    }
  }
}

// WhiteBalance 처리 수정
export const processWhiteBalanceComponent = (value: number) => {
  return value / 20; // 10에서 20으로 변경
};

// GrainEffect 처리 수정
export const processWeakStrong = (value: number): WeakStrong => {
  switch (value) {
    case 8: // 16에서 8로 변경
      return "weak";
    case 16: // 32에서 16으로 변경
      return "strong";
    default:
      return "off";
  }
};

// Tone(Shadow/Highlight) 처리 수정
export const processTone = (value: number) => {
  return value === 0 ? 0 : -(value / 16); // 32에서 16으로 변경
};

// ColorChrome 효과 처리 수정
export const processColorChrome = (value: number): WeakStrong => {
  switch (value) {
    case 1:
      return "weak";
    case 2:
      return "strong";
    default:
      return "off";
  }
};
