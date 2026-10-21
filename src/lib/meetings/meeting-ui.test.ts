import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import {
  MeetingSection,
  isValidGoogleMeetUrl,
  GOOGLE_MEET_REGEX,
  validateAndDispatchMeeting,
  Meeting,
} from "../../app/freelancer/projects/[id]/meeting-section";

describe("CommitCheck Meeting UI & State Initialization", () => {
  describe("Google Meet URL validation", () => {
    it("rejects empty or whitespace-only URLs", () => {
      assert.equal(isValidGoogleMeetUrl(""), false);
      assert.equal(isValidGoogleMeetUrl("   "), false);
    });

    it("rejects non-Google Meet URLs", () => {
      assert.equal(isValidGoogleMeetUrl("https://zoom.us/j/123456789"), false);
      assert.equal(isValidGoogleMeetUrl("https://teams.microsoft.com/l/meetup-join/123"), false);
      assert.equal(isValidGoogleMeetUrl("https://not-meet.google.com/abc-defg-hij"), false);
    });

    it("rejects malformed Google Meet URLs", () => {
      assert.equal(isValidGoogleMeetUrl("https://meet.google.com/"), false);
      assert.equal(isValidGoogleMeetUrl("http://meet.google.com/abc-defg-hij"), false);
      assert.equal(isValidGoogleMeetUrl("https://meet.google.com/abc defg hij"), false);
    });

    it("accepts valid Google Meet URLs", () => {
      assert.equal(isValidGoogleMeetUrl("https://meet.google.com/abc-defg-hij"), true);
      assert.equal(isValidGoogleMeetUrl("https://meet.google.com/xaq-ahkq-sis"), true);
      assert.equal(isValidGoogleMeetUrl("https://meet.google.com/xxx-yyyy-zzz"), true);
      assert.equal(isValidGoogleMeetUrl("  https://meet.google.com/test-room-123  "), true);
    });
  });

  describe("Initial State — No meeting dispatched", () => {
    it("renders neutral status and does NOT render 'Bot Joining Room' when no meeting exists", () => {
      const html = renderToString(
        React.createElement(MeetingSection, {
          projectId: "proj_test_123",
          initialMeetings: [],
        })
      );

      // Must NOT display "Bot Joining Room"
      assert.ok(
        !html.includes("Bot Joining Room"),
        "Initial state must not say 'Bot Joining Room'"
      );

      // Must display neutral status
      assert.ok(
        html.includes("No meeting dispatched"),
        "Initial state must display 'No meeting dispatched'"
      );

      // Must NOT prefill fake/example URL "abc-defg-hij"
      assert.ok(
        !html.includes("abc-defg-hij"),
        "Must not contain hard-coded fake URL 'abc-defg-hij'"
      );

      // Must have placeholder asking to paste Google Meet room link
      assert.ok(
        html.includes("Paste your Google Meet room link"),
        "Input placeholder must prompt user to paste link"
      );

      // Dispatch button must be disabled when URL is empty
      assert.ok(
        html.includes("disabled"),
        "Dispatch button must be disabled when URL input is empty"
      );
    });
  });

  describe("Existing Meeting State — Database records present", () => {
    it("renders real meeting status and URL from backend data without fake URLs", () => {
      const realMeeting: Meeting = {
        id: "meeting_real_001",
        meetUrl: "https://meet.google.com/my-real-room-999",
        status: "JOINING",
        transcript: null,
        transcriptJson: null,
        createdAt: "2026-10-21T10:00:00.000Z",
      };

      const html = renderToString(
        React.createElement(MeetingSection, {
          projectId: "proj_test_123",
          initialMeetings: [realMeeting],
        })
      );

      // Must display the real meeting URL
      assert.ok(
        html.includes("https://meet.google.com/my-real-room-999"),
        "Must render the real meeting URL from database"
      );

      // Must NOT display fake URL
      assert.ok(
        !html.includes("abc-defg-hij"),
        "Must never display fake URL 'abc-defg-hij'"
      );

      // Because status is JOINING, it should display "Bot Joining Room"
      assert.ok(
        html.includes("Bot Joining Room"),
        "Must render 'Bot Joining Room' when meeting status is JOINING"
      );

      // Button should be disabled because meeting is already in progress
      assert.ok(
        html.includes("disabled"),
        "Dispatch button must be disabled while a meeting is in progress"
      );
    });

    it("renders completed meeting status and transcript correctly", () => {
      const completedMeeting: Meeting = {
        id: "meeting_real_002",
        meetUrl: "https://meet.google.com/client-discovery-call",
        status: "COMPLETED",
        transcript: "Elena: We need Stripe Elements and receipts.\nAlex: I will build it.",
        transcriptJson: null,
        createdAt: "2026-10-21T09:00:00.000Z",
      };

      const html = renderToString(
        React.createElement(MeetingSection, {
          projectId: "proj_test_123",
          initialMeetings: [completedMeeting],
        })
      );

      // Must display "Transcript Ingested"
      assert.ok(
        html.includes("Transcript Ingested"),
        "Must render 'Transcript Ingested' badge for completed meeting"
      );

      // Must display the transcript text
      assert.ok(
        html.includes("Elena: We need Stripe Elements and receipts."),
        "Must render transcript text"
      );

      // Must display the room link
      assert.ok(
        html.includes("https://meet.google.com/client-discovery-call"),
        "Must display real room link in transcript card"
      );
    });
  });

  describe("Dispatch Submission & API Gating", () => {
    it("does not call the dispatch API when URL is empty", async () => {
      let apiCalled = false;
      const mockFetch = async () => {
        apiCalled = true;
        return new Response(JSON.stringify({}), { status: 200 });
      };

      const result = await validateAndDispatchMeeting({
        meetUrl: "",
        projectId: "proj_test_123",
        fetchFn: mockFetch as any,
      });

      assert.equal(result.success, false);
      assert.equal(apiCalled, false, "Dispatch API must not be called when URL is empty");
      assert.equal(result.error, "Please enter a Google Meet room link.");
    });

    it("does not call the dispatch API when URL is invalid", async () => {
      let apiCalled = false;
      const mockFetch = async () => {
        apiCalled = true;
        return new Response(JSON.stringify({}), { status: 200 });
      };

      const result = await validateAndDispatchMeeting({
        meetUrl: "https://zoom.us/j/123456789",
        projectId: "proj_test_123",
        fetchFn: mockFetch as any,
      });

      assert.equal(result.success, false);
      assert.equal(apiCalled, false, "Dispatch API must not be called when URL is invalid");
      assert.equal(
        result.error,
        "Invalid Google Meet URL. Must match format 'https://meet.google.com/xxx-yyyy-zzz'."
      );
    });

    it("dispatches normally and calls the API when a valid Google Meet URL is provided", async () => {
      let apiCalled = false;
      let requestedEndpoint = "";
      let sentBody = "";

      const expectedMeeting: Meeting = {
        id: "m_dispatched_99",
        meetUrl: "https://meet.google.com/abc-defg-hij",
        status: "JOINING",
        transcript: null,
        transcriptJson: null,
        createdAt: new Date().toISOString(),
      };

      const mockFetch = async (url: string | URL | Request, init?: RequestInit) => {
        apiCalled = true;
        requestedEndpoint = url.toString();
        sentBody = init?.body?.toString() || "";
        return new Response(
          JSON.stringify({
            meeting: expectedMeeting,
          }),
          { status: 201 }
        );
      };

      const result = await validateAndDispatchMeeting({
        meetUrl: "https://meet.google.com/abc-defg-hij",
        projectId: "proj_test_123",
        fetchFn: mockFetch as any,
      });

      assert.equal(result.success, true);
      assert.equal(apiCalled, true, "Dispatch API must be called for valid URL");
      assert.equal(requestedEndpoint, "/api/projects/proj_test_123/meetings");
      assert.deepEqual(JSON.parse(sentBody), {
        meetUrl: "https://meet.google.com/abc-defg-hij",
        autoSimulate: true,
      });
      assert.equal(result.meeting?.id, "m_dispatched_99");
      assert.equal(result.meeting?.status, "JOINING");
    });
  });
});
