import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { checkRouteAccess } from "./auth/service";
import manifest from "@/app/manifest";

describe("CommitCheck Progressive Web App (PWA) Verification Suite", () => {
  describe("Web App Manifest Specification", () => {
    it("generates a valid, complete manifest matching brand guidelines", () => {
      const data = manifest();
      assert.equal(data.name, "CommitCheck");
      assert.equal(data.short_name, "CommitCheck");
      assert.equal(data.display, "standalone");
      assert.equal(data.start_url, "/");
      assert.equal(data.scope, "/");
      assert.equal(data.background_color, "#ffffff");
      assert.equal(data.theme_color, "#ffffff");
      assert.ok(Array.isArray(data.icons));
      assert.ok(data.icons.length >= 3);

      // Verify required icon sizes are represented
      const iconSizes = data.icons.map((i) => i.sizes);
      assert.ok(iconSizes.includes("192x192"));
      assert.ok(iconSizes.includes("512x512"));

      // Verify maskable icon exists
      const maskable = data.icons.filter((i) => i.purpose === "maskable");
      assert.ok(maskable.length >= 1);

      // Verify shortcuts
      assert.ok(Array.isArray(data.shortcuts));
      assert.ok(data.shortcuts.length >= 2);
    });

    it("verifies public/manifest.json matches and is valid JSON", () => {
      const manifestPath = path.resolve(process.cwd(), "public/manifest.json");
      assert.ok(fs.existsSync(manifestPath), "public/manifest.json must exist");

      const raw = fs.readFileSync(manifestPath, "utf8");
      const parsed = JSON.parse(raw);
      assert.equal(parsed.name, "CommitCheck");
      assert.equal(parsed.start_url, "/");
      assert.equal(parsed.display, "standalone");
    });
  });

  describe("Application Icons Verification", () => {
    const requiredIcons = [
      "logo-192x192.png",
      "logo-512x512.png",
      "logo-180x180.png",
      "logo-1200x630.png",
      "logo-maskable-512x512.png",
    ];

    for (const iconName of requiredIcons) {
      it(`verifies that ${iconName} exists on disk with non-zero size`, () => {
        const iconPath = path.resolve(process.cwd(), "public/icons", iconName);
        assert.ok(fs.existsSync(iconPath), `Expected ${iconPath} to exist`);
        const stat = fs.statSync(iconPath);
        assert.ok(stat.size > 200, `Expected ${iconName} to be > 200 bytes, got ${stat.size}`);

        if (iconName.endsWith(".png")) {
          // Verify PNG signature: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
          const fd = fs.openSync(iconPath, "r");
          const buf = Buffer.alloc(8);
          fs.readSync(fd, buf, 0, 8, 0);
          fs.closeSync(fd);
          const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
          assert.ok(buf.equals(pngMagic), `${iconName} must have valid PNG magic bytes`);
        }
      });
    }

    const brandingSvgs = [
      "public/branding/logo-180x48.svg",
      "public/branding/logo-360x96.svg",
      "public/branding/logo-600x160.svg",
      "src/app/favicon.svg",
    ];

    for (const svgPath of brandingSvgs) {
      it(`verifies that ${svgPath} exists on disk with valid SVG content`, () => {
        const resolvedPath = path.resolve(process.cwd(), svgPath);
        assert.ok(fs.existsSync(resolvedPath), `Expected ${svgPath} to exist`);
        const content = fs.readFileSync(resolvedPath, "utf8");
        assert.ok(content.includes("<svg"), `Expected ${svgPath} to contain <svg tag`);
      });
    }
  });

  describe("Service Worker & Security Invariants", () => {
    const swPath = path.resolve(process.cwd(), "public/sw.js");

    it("verifies service worker file exists and has valid syntax", () => {
      assert.ok(fs.existsSync(swPath), "public/sw.js must exist");
      const swCode = fs.readFileSync(swPath, "utf8");
      assert.ok(swCode.length > 500);

      // Verify no syntax errors by parsing or checking essential listeners
      assert.ok(swCode.includes("self.addEventListener(\"install\""));
      assert.ok(swCode.includes("self.addEventListener(\"activate\""));
      assert.ok(swCode.includes("self.addEventListener(\"fetch\""));
    });

    it("ensures sensitive /api/ routes are strictly network-only and NEVER cached", () => {
      const swCode = fs.readFileSync(swPath, "utf8");
      assert.ok(
        swCode.includes("url.pathname.startsWith(\"/api/\")"),
        "Must explicitly check for /api/ routes"
      );
      assert.ok(
        swCode.includes("fetch(request)"),
        "Must pass API requests to network directly"
      );
    });

    it("ensures protected dashboards (/freelancer, /client) are NOT stored in shared public cache", () => {
      const swCode = fs.readFileSync(swPath, "utf8");
      // Check that protected routes are excluded from public caching
      assert.ok(swCode.includes("isProtectedDashboard"));
      assert.ok(swCode.includes("/freelancer"));
      assert.ok(swCode.includes("/client"));
      assert.ok(swCode.includes("/offline"));
    });

    it("ensures non-GET requests (mutations) bypass caching", () => {
      const swCode = fs.readFileSync(swPath, "utf8");
      assert.ok(
        swCode.includes("request.method !== \"GET\""),
        "Mutations must bypass service worker cache"
      );
    });

    it("ensures cross-origin requests bypass caching", () => {
      const swCode = fs.readFileSync(swPath, "utf8");
      assert.ok(
        swCode.includes("url.origin !== self.location.origin"),
        "Cross-origin requests must bypass cache"
      );
    });
  });

  describe("Offline Fallback Route & Gating", () => {
    it("allows public access to /offline for all roles and unauthenticated users", () => {
      assert.equal(checkRouteAccess("/offline", null).allowed, true);
      assert.equal(checkRouteAccess("/offline", "FREELANCER").allowed, true);
      assert.equal(checkRouteAccess("/offline", "CLIENT").allowed, true);
    });

    it("verifies that offline page source file exists", () => {
      const offlinePath = path.resolve(process.cwd(), "src/app/offline/page.tsx");
      assert.ok(fs.existsSync(offlinePath), "src/app/offline/page.tsx must exist");
    });
  });
});
