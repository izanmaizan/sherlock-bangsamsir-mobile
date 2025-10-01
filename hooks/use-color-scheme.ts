// hooks/use-color-scheme.ts
import { useColorScheme as useNativeColorScheme } from "react-native";

export function useColorScheme() {
  return useNativeColorScheme() ?? "light";
}
