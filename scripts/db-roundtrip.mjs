import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) throw new Error(`CHECK FAILED: ${name} ${detail}`);
}

async function main() {
  // 1. Create freelancer + client users
  const suffix = Date.now();
  const freelancer = await prisma.user.create({
    data: {
      email: `rt-freelancer-${suffix}@example.com`,
      name: "RT Freelancer",
      role: "FREELANCER",
      githubId: `gh-${suffix}`,
    },
  });
  const client = await prisma.user.create({
    data: {
      email: `rt-client-${suffix}@example.com`,
      name: "RT Client",
      role: "CLIENT",
      googleId: `gg-${suffix}`,
    },
  });
  check("create users", true, freelancer.id + "," + client.id);

  // 2. Project with both relations
  const project = await prisma.project.create({
    data: {
      name: "Round-trip test",
      githubRepo: "test/repo",
      clientEmail: client.email.toLowerCase(),
      freelancerId: freelancer.id,
      clientId: client.id,
    },
  });
  const fetchedProject = await prisma.project.findUnique({
    where: { id: project.id },
    include: { freelancer: true, client: true },
  });
  check(
    "project relational include",
    fetchedProject.freelancer.email === freelancer.email &&
      fetchedProject.client.email === client.email
  );

  // 3. Meeting
  const meeting = await prisma.meeting.create({
    data: {
      projectId: project.id,
      meetUrl: "https://meet.google.com/rt-test",
      status: "COMPLETED",
      transcript: "plain text transcript",
      transcriptJson: JSON.stringify({ segments: [] }),
    },
  });
  check("meeting persisted", (await prisma.meeting.count({ where: { projectId: project.id } })) === 1);

  // 4. Task draft with classification enums
  const draft = await prisma.linearTaskDraft.create({
    data: {
      meetingId: meeting.id,
      projectId: project.id,
      title: "RT draft",
      description: "desc",
      classification: "AI_INFERRED",
      clientApprovalStatus: "PENDING_CLIENT_APPROVAL",
      evidence: "quote",
      confidence: 0.87,
    },
  });
  check(
    "task draft enums",
    draft.classification === "AI_INFERRED" &&
      draft.clientApprovalStatus === "PENDING_CLIENT_APPROVAL"
  );

  // 5. Audit report
  const report = await prisma.auditReport.create({
    data: {
      projectId: project.id,
      summary: "ok",
      verifiedPercentage: 100,
      triggeredById: freelancer.id,
      verifiedTasksJson: "[]",
      discrepanciesJson: "[]",
    },
  });
  check(
    "audit report counts",
    (await prisma.auditReport.count({ where: { projectId: project.id } })) === 1
  );

  // 6. Cascade delete: deleting project removes meeting, drafts, report
  await prisma.project.delete({ where: { id: project.id } });
  check(
    "cascade delete",
    (await prisma.meeting.count({ where: { id: meeting.id } })) === 0 &&
      (await prisma.linearTaskDraft.count({ where: { id: draft.id } })) === 0 &&
      (await prisma.auditReport.count({ where: { id: report.id } })) === 0
  );

  // 7. Users still exist, then cleanup
  await prisma.user.delete({ where: { id: freelancer.id } });
  await prisma.user.delete({ where: { id: client.id } });
  check(
    "cleanup",
    (await prisma.user.count({ where: { email: { contains: suffix.toString() } } })) === 0
  );

  console.log("ROUND-TRIP: all checks passed");
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
