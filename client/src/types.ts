export type Role = "HELP_SEEKER" | "VOLUNTEER" | "BOTH" | "ADMIN";

export type Category =
  | "EDUCATION"
  | "FOOD"
  | "HEALTHCARE"
  | "TRANSPORTATION"
  | "ELDERLY_CARE"
  | "COMMUNITY_SERVICE"
  | "DIGITAL_ASSISTANCE"
  | "OTHER";

export type Urgency = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type RequestStatus =
  | "OPEN"
  | "VOLUNTEER_INTERESTED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "CLOSED";

export interface User {
  id: string;
  nexconnId: string;
  email: string;
  fullName: string;
  city: string;
  locality: string;
  phone: string | null;
  photoUrl: string | null;
  role: Role;
  introduction: string;
  interests: Category[];
  skills: string[];
  availability: string;
  suspended: boolean;
  onboardingDone: boolean;
  createdAt: string;
}

export interface HelpRequest {
  id: string;
  title: string;
  description: string;
  category: Category;
  location: string;
  city: string;
  locality: string;
  preferredDate: string | null;
  preferredTime: string | null;
  urgency: Urgency;
  volunteerCount: number;
  imageUrl: string | null;
  instructions: string | null;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    nexconnId: string;
    fullName: string;
    city: string;
    locality: string;
    photoUrl: string | null;
    role: Role;
    introduction: string;
  };
  offerCount: number;
  connectionCount: number;
  explanation?: string | null;
}
