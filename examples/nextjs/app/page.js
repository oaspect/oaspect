"use client";

import { ApiReference } from "@oaspect/react";

export default function Page() {
  return <ApiReference specUrl="/openapi" proxyUrl="/api/proxy" />;
}
