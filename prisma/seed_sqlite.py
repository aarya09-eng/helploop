import sqlite3
import bcrypt
import os
import uuid
import datetime

db_path = 'prisma/dev.db'
if not os.path.exists(db_path):
    print("Database not found at", db_path)
    exit(1)

conn = sqlite3.connect(db_path)
c = conn.cursor()

# Hash password "password123" with bcrypt (cost 12)
hashed_pw = bcrypt.hashpw(b"password123", bcrypt.gensalt(12)).decode('utf-8')

print("Seeding database via direct SQLite...")

# Clear tables
c.execute("DELETE FROM ActivityParticipant")
c.execute("DELETE FROM HelpConnection")
c.execute("DELETE FROM VolunteerOffer")
c.execute("DELETE FROM HelpRequest")
c.execute("DELETE FROM CommunityActivity")
c.execute("DELETE FROM Notification")
c.execute("DELETE FROM User")

now = datetime.datetime.utcnow().isoformat()

# Insert Admin
admin_id = "cl_admin_" + uuid.uuid4().hex[:8]
c.execute("""
    INSERT INTO User (id, nexconnId, email, passwordHash, fullName, city, locality, role, introduction, interests, skills, availability, suspended, onboardingDone, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", (admin_id, "u_admin1234567", "admin@helploop.org", hashed_pw, "HelpLoop Admin", "Mumbai", "Andheri", "ADMIN", "", "", "", "", 0, 1, now, now))

# Insert Seeker
seeker_id = "cl_seeker_" + uuid.uuid4().hex[:8]
c.execute("""
    INSERT INTO User (id, nexconnId, email, passwordHash, fullName, city, locality, role, introduction, interests, skills, availability, suspended, onboardingDone, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", (seeker_id, "u_seeker123456", "rahul@example.com", hashed_pw, "Rahul Sharma", "Mumbai", "Bandra", "HELP_SEEKER", "I am a senior citizen looking for occasional help with groceries and technology.", "", "", "", 0, 1, now, now))

# Insert Volunteer
volunteer_id = "cl_vol_" + uuid.uuid4().hex[:8]
c.execute("""
    INSERT INTO User (id, nexconnId, email, passwordHash, fullName, city, locality, role, introduction, interests, skills, availability, suspended, onboardingDone, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", (volunteer_id, "u_vol123456789", "priya@example.com", hashed_pw, "Priya Patel", "Mumbai", "Bandra", "VOLUNTEER", "I love helping out my neighbors! I'm good with computers and teaching.", "EDUCATION,DIGITAL_ASSISTANCE", "Teaching, Computers, Organization", "Weekends and weekday evenings", 0, 1, now, now))

# Insert Help Request 1
req1_id = "cl_req1_" + uuid.uuid4().hex[:8]
c.execute("""
    INSERT INTO HelpRequest (id, ownerId, title, description, category, location, city, locality, urgency, volunteerCount, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", (req1_id, seeker_id, "Help with setting up a new tablet", "I just got a new iPad but I'm struggling to set up my email and video calling apps to talk to my grandkids.", "DIGITAL_ASSISTANCE", "Bandra West, near the station", "Mumbai", "Bandra", "MEDIUM", 1, "OPEN", now, now))

# Insert Help Request 2
req2_id = "cl_req2_" + uuid.uuid4().hex[:8]
c.execute("""
    INSERT INTO HelpRequest (id, ownerId, title, description, category, location, city, locality, urgency, volunteerCount, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
""", (req2_id, seeker_id, "Grocery pickup from Reliance Fresh", "Need someone to pick up a few heavy bags of groceries and drop them at my doorstep. I have already paid for them online.", "FOOD", "Pali Hill", "Mumbai", "Bandra", "HIGH", 1, "OPEN", now, now))

# Insert Offer
offer_id = "cl_off1_" + uuid.uuid4().hex[:8]
c.execute("""
    INSERT INTO VolunteerOffer (id, requestId, volunteerId, message, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
""", (offer_id, req1_id, volunteer_id, "I'd be happy to help you with your iPad! I'm free this Saturday afternoon.", "PENDING", now, now))

conn.commit()
conn.close()
print("✅ SQLite seeding successful!")
