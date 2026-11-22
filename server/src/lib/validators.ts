import { z } from "zod";

export const categories = [
  "EDUCATION",
  "FOOD",
  "HEALTHCARE",
  "TRANSPORTATION",
  "ELDERLY_CARE",
  "COMMUNITY_SERVICE",
  "DIGITAL_ASSISTANCE",
  "OTHER",
] as const;

export const roles = ["HELP_SEEKER", "VOLUNTEER", "BOTH"] as const;
export const urgencies = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export const requestStatuses = [
  "OPEN",
  "VOLUNTEER_INTERESTED",
  "ASSIGNED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "CLOSED",
] as const;

const imageUrl = z
  .string()
  .max(400_000)
  .refine(
    (value) => value.startsWith("data:image/") || value.startsWith("https://") || value.startsWith("http://"),
    "Image must be an uploaded picture or an http(s) URL",
  )
  .optional()
  .nullable();

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2).max(80),
    email: z.string().trim().email().max(160),
    password: z.string().min(8).max(72),
    confirmPassword: z.string().min(8).max(72),
    city: z.string().trim().min(2).max(80),
    locality: z.string().trim().min(2).max(80),
    phone: z.string().trim().max(20).optional().nullable(),
    photoUrl: imageUrl,
    role: z.enum(roles),
    introduction: z.string().trim().max(1000).optional().default(""),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(72),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: z.string().min(8).max(72),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  city: z.string().trim().min(2).max(80).optional(),
  locality: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(20).optional().nullable(),
  photoUrl: imageUrl,
  role: z.enum(roles).optional(),
  introduction: z.string().trim().max(1000).optional(),
  interests: z.array(z.enum(categories)).max(8).optional(),
  skills: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  availability: z.string().trim().max(300).optional(),
  onboardingDone: z.boolean().optional(),
});

export const requestSchema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(5000),
  category: z.enum(categories),
  location: z.string().trim().min(2).max(160),
  city: z.string().trim().min(2).max(80),
  locality: z.string().trim().min(2).max(80),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  urgency: z.enum(urgencies).default("MEDIUM"),
  volunteerCount: z.number().int().min(1).max(20).default(1),
  imageUrl: imageUrl,
  instructions: z.string().trim().max(2000).optional().nullable(),
});

export const offerSchema = z.object({
  message: z.string().trim().max(500).optional().default(""),
});

export const offerUpdateSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED", "WITHDRAWN"]),
});

export const activitySchema = z.object({
  title: z.string().trim().min(5).max(120),
  description: z.string().trim().min(20).max(5000),
  category: z.enum(categories),
  location: z.string().trim().min(2).max(160),
  city: z.string().trim().min(2).max(80),
  activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  activityTime: z.string().regex(/^\d{2}:\d{2}$/),
  maxParticipants: z.number().int().min(2).max(300),
});

export const activityStatusSchema = z.object({
  status: z.enum(["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"]),
});

export const reportSchema = z.object({
  targetType: z.enum(["USER", "REQUEST", "ACTIVITY"]),
  targetId: z.string().min(1).max(80),
  reason: z.string().trim().min(5).max(160),
  details: z.string().trim().max(2000).optional().default(""),
});

export const blockSchema = z.object({
  userId: z.string().min(1),
});

export const aiSchema = z.object({
  task: z.enum(["improve", "categorize", "summarize"]),
  text: z.string().trim().min(10).max(4000),
});

export const requestStatusSchema = z.object({
  status: z.enum(requestStatuses),
});
