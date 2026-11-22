const { PrismaClient, Role, Category, Urgency } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const prisma = new PrismaClient();

function createNexconnId() {
  return `u${crypto.randomBytes(12).toString("hex")}`;
}

async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

async function main() {
  console.log("🌱 Seeding database with JavaScript...");

  await prisma.activityParticipant.deleteMany();
  await prisma.helpConnection.deleteMany();
  await prisma.volunteerOffer.deleteMany();
  await prisma.helpRequest.deleteMany();
  await prisma.communityActivity.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.user.deleteMany();

  const commonPassword = await hashPassword("password123");

  const admin = await prisma.user.create({
    data: {
      email: "admin@helploop.org",
      passwordHash: commonPassword,
      fullName: "HelpLoop Admin",
      city: "Mumbai",
      locality: "Andheri",
      role: Role.ADMIN,
      nexconnId: createNexconnId(),
      onboardingDone: true,
    },
  });

  const seeker = await prisma.user.create({
    data: {
      email: "rahul@example.com",
      passwordHash: commonPassword,
      fullName: "Rahul Sharma",
      city: "Mumbai",
      locality: "Bandra",
      role: Role.HELP_SEEKER,
      nexconnId: createNexconnId(),
      introduction: "I am a senior citizen looking for occasional help with groceries and technology.",
      onboardingDone: true,
    },
  });

  const volunteer = await prisma.user.create({
    data: {
      email: "priya@example.com",
      passwordHash: commonPassword,
      fullName: "Priya Patel",
      city: "Mumbai",
      locality: "Bandra",
      role: Role.VOLUNTEER,
      nexconnId: createNexconnId(),
      introduction: "I love helping out my neighbors! I'm good with computers and teaching.",
      skills: "Teaching, Computers, Organization",
      interests: "EDUCATION,DIGITAL_ASSISTANCE",
      availability: "Weekends and weekday evenings",
      onboardingDone: true,
    },
  });

  const req1 = await prisma.helpRequest.create({
    data: {
      ownerId: seeker.id,
      title: "Help with setting up a new tablet",
      description: "I just got a new iPad but I'm struggling to set up my email and video calling apps to talk to my grandkids.",
      category: Category.DIGITAL_ASSISTANCE,
      location: "Bandra West, near the station",
      city: "Mumbai",
      locality: "Bandra",
      urgency: Urgency.MEDIUM,
      status: "OPEN",
    },
  });

  const req2 = await prisma.helpRequest.create({
    data: {
      ownerId: seeker.id,
      title: "Grocery pickup from Reliance Fresh",
      description: "Need someone to pick up a few heavy bags of groceries and drop them at my doorstep. I have already paid for them online.",
      category: Category.FOOD,
      location: "Pali Hill",
      city: "Mumbai",
      locality: "Bandra",
      urgency: Urgency.HIGH,
      status: "OPEN",
    },
  });

  await prisma.volunteerOffer.create({
    data: {
      requestId: req1.id,
      volunteerId: volunteer.id,
      message: "I'd be happy to help you with your iPad! I'm free this Saturday afternoon.",
      status: "PENDING",
    },
  });

  console.log("✅ Seeding via JS complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
