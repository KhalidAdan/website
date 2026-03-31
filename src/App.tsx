import { ThemeProvider } from "@/hooks/useTheme";
import Editor from "@/pages/Editor";
import Home from "@/pages/Home";
import { Route, Routes } from "react-router-dom";

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/md" element={<Editor />} />
      </Routes>
    </ThemeProvider>
  );
}
