
content = """"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import api from "@/lib/api";
import type { FacebookPage, Post } from "@/lib/types";
import {
  Globe,
  FileText,
  Users,
  TrendingUp,
  ArrowUpRight,
  Clock,
  CheckCircle,
  CalendarClock,
} from "lucide-react";
import Link from "next/link";
"""
print(content[:100])
