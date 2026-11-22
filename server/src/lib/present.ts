// @ts-nocheck


export const CATEGORY_LABELS: Record<Category, string> = {
  EDUCATION: "Education",
  FOOD: "Food & Essentials",
  HEALTHCARE: "Healthcare Support",
  TRANSPORTATION: "Transportation",
  ELDERLY_CARE: "Elderly Care",
  COMMUNITY_SERVICE: "Community Service",
  DIGITAL_ASSISTANCE: "Digital Assistance",
  OTHER: "Other",
};

export const URGENCY_WEIGHT: Record<Urgency, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  URGENT: 4,
};

type PublicShape = {
  id: string;
  nexconnId: string;
  fullName: string;
  city: string;
  locality: string;
  photoUrl: string | null;
  role: Role;
  introduction: string;
  interests: string; // changed from Category[]
  skills: string[];
  availability: string;
  createdAt: Date;
};

export function publicUser<T extends PublicShape>(user: T) {
  return {
    id: user.id,
    nexconnId: user.nexconnId,
    fullName: user.fullName,
    city: user.city,
    locality: user.locality,
    photoUrl: user.photoUrl,
    role: user.role,
    introduction: user.introduction,
    interests: user.interests,
    skills: user.skills,
    availability: user.availability,
    createdAt: user.createdAt,
  };
}

export function privateUser<
  T extends PublicShape & { email: string; phone: string | null; suspended: boolean; onboardingDone: boolean },
>(user: T) {
  return {
    ...publicUser(user),
    email: user.email,
    phone: user.phone,
    suspended: user.suspended,
    onboardingDone: user.onboardingDone,
  };
}

export function profileCompletion(user: {
  fullName: string;
  city: string;
  locality: string;
  introduction: string;
  role: Role;
  interests: Category[];
  skills: string[];
  availability: string;
  photoUrl: string | null;
}) {
  const checks = [
    Boolean(user.fullName),
    Boolean(user.city && user.locality),
    user.introduction.trim().length >= 20,
    Boolean(user.photoUrl),
    user.role === "VOLUNTEER" || user.role === "BOTH" || user.role === "ADMIN" ? user.interests.length > 0 : true,
    user.skills.length > 0,
    Boolean(user.availability.trim()),
  ];
  const done = checks.filter(Boolean).length;
  return Math.round((done / checks.length) * 100);
}

export function canVolunteer(role: Role) {
  return role === "VOLUNTEER" || role === "BOTH" || role === "ADMIN";
}

export function matchRequest(
  user: { interests: Category[]; skills: string[]; city: string; locality: string; availability: string },
  request: { category: Category; title: string; description: string; city: string; locality: string; urgency: Urgency },
) {
  const reasons: string[] = [];
  let score = 0;
  if (user.interests.includes(request.category)) {
    score += 40;
    reasons.push(`matches your ${CATEGORY_LABELS[request.category]} interest`);
  }
  if (user.city.trim().toLowerCase() === request.city.trim().toLowerCase()) {
    score += 25;
    reasons.push("is in your city");
  }
  if (user.locality.trim().toLowerCase() === request.locality.trim().toLowerCase()) {
    score += 20;
    reasons.push("matches your selected locality");
  }
  if (request.urgency === "HIGH" || request.urgency === "URGENT") {
    score += 10;
    reasons.push("is marked high priority");
  }
  const haystack = `${request.title} ${request.description}`.toLowerCase();
  if (user.skills.some((skill) => skill.trim().length > 1 && haystack.includes(skill.trim().toLowerCase()))) {
    score += 15;
    reasons.push("mentions one of your skills");
  }
  if (user.availability.trim()) {
    score += 5;
  }
  const explanation = reasons.length
    ? `Recommended because this request ${reasons.join(", ")}.`
    : "Open request you can review. Category, city, and skills did not produce a stronger match.";
  return { score, explanation };
}
