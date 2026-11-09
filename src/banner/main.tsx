import { createRoot } from "react-dom/client";
import "../styles.css";
import { Banner } from "./Banner.tsx";

const root = document.getElementById("banner");
if (root) createRoot(root).render(<Banner />);
