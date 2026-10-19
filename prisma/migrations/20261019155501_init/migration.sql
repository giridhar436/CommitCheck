-- CreateEnum
CREATE TYPE "Role" AS ENUM ('FREELANCER', 'CLIENT');

-- CreateEnum
CREATE TYPE "RequirementClassification" AS ENUM ('EXPLICIT', 'AI_INFERRED', 'TENTATIVE', 'CONFIRMED_COMMITMENT');

-- CreateEnum
CREATE TYPE "ClientApprovalStatus" AS ENUM ('NOT_REQUIRED', 'PENDING_CLIENT_APPROVAL', 'CLIENT_APPROVED', 'CLIENT_REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL,
    "githubId" TEXT,
    "githubUsername" TEXT,
    "githubAccessToken" TEXT,
    "googleId" TEXT,
    "linearAccessToken" TEXT,
    "linearRefreshToken" TEXT,
    "linearWorkspaceId" TEXT,
    "linearWorkspaceName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "clientEmail" TEXT,
    "githubRepo" TEXT NOT NULL,
    "githubRepoFullName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "linearProjectId" TEXT,
    "linearProjectUrl" TEXT,
    "linearTeamId" TEXT,
    "freelancerId" TEXT NOT NULL,
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meeting" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "meetUrl" TEXT NOT NULL,
    "botId" TEXT,
    "recallBotId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "transcript" TEXT,
    "transcriptJson" TEXT,
    "analysisJson" TEXT,
    "analyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinearTaskDraft" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "projectId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "classification" "RequirementClassification" NOT NULL DEFAULT 'EXPLICIT',
    "clientApprovalStatus" "ClientApprovalStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "evidence" TEXT,
    "confidence" DOUBLE PRECISION,
    "suggestedMilestone" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "estimate" INTEGER,
    "linearIssueId" TEXT,
    "linearIssueKey" TEXT,
    "linearIssueUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinearTaskDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditReport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "auditorRole" TEXT NOT NULL DEFAULT 'FREELANCER_SELF_CHECK',
    "summary" TEXT NOT NULL,
    "verifiedPercentage" DOUBLE PRECISION NOT NULL,
    "verifiedTasksJson" TEXT NOT NULL DEFAULT '[]',
    "discrepanciesJson" TEXT NOT NULL DEFAULT '[]',
    "ghostCompletions" INTEGER NOT NULL DEFAULT 0,
    "untrackedCommits" INTEGER NOT NULL DEFAULT 0,
    "latestCommitSha" TEXT,
    "triggeredById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinearTaskDraft" ADD CONSTRAINT "LinearTaskDraft_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditReport" ADD CONSTRAINT "AuditReport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
