-- CreateEnum
CREATE TYPE "ConversationState" AS ENUM ('IDLE', 'WAITING_FOR_INPUT', 'PROCESSING', 'COMPLETED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "conversationState" "ConversationState" NOT NULL DEFAULT 'IDLE',
ADD COLUMN     "googleAccessToken" TEXT,
ADD COLUMN     "googleRefreshToken" TEXT,
ADD COLUMN     "googleTokenExpiry" TIMESTAMP(3);
