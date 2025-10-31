import express from "express";
import cors from "cors";

// routes (flat files)
import health from "./health";
import deals from "./deals";
import banks from "./banks";
import companies from "./companies";

// job + env (flat files)
import discoverAndIngest from "./discover";
import { ENV } from "./env";
