require("dotenv").config();
const { v4: uuid } = require("uuid");
const bcrypt = require("bcryptjs");
const db = require("./database");

function upsertUser({ full_name, email, phone, password, role }) {
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return existing.id;
  const id = uuid();
  const password_hash = bcrypt.hashSync(password, 10);
  db.prepare(
    `INSERT INTO users (id, full_name, email, phone, password_hash, role)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, full_name, email, phone, password_hash, role);
  return id;
}

function upsertDocType({ name, description, fee, requirements }) {
  const existing = db.prepare("SELECT id FROM document_types WHERE name = ?").get(name);
  if (existing) return existing.id;
  const id = uuid();
  db.prepare(
    `INSERT INTO document_types (id, name, description, fee, requirements)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, name, description, fee, requirements);
  return id;
}

const adminId = upsertUser({
  full_name: "Noel Montecillo",
  email: "admin@barangay.gov.ph",
  phone: "09170000000",
  password: "Admin@12345",
  role: "admin",
});

const staffId = upsertUser({
  full_name: "Barangay Staff",
  email: "staff@barangay.gov.ph",
  phone: "09170000001",
  password: "Staff@12345",
  role: "staff",
});

const residentId = upsertUser({
  full_name: "Juan Dela Cruz",
  email: "resident@example.com",
  phone: "09170000002",
  password: "Resident@123",
  role: "resident",
});

upsertDocType({
  name: "Barangay Clearance",
  description: "General-purpose clearance certifying good standing in the barangay.",
  fee: 50,
  requirements: "Valid ID, Proof of Residency",
});

upsertDocType({
  name: "Certificate of Indigency",
  description: "Certifies that the resident belongs to a low-income household.",
  fee: 0,
  requirements: "Valid ID, Barangay Clearance",
});

upsertDocType({
  name: "Certificate of Residency",
  description: "Certifies that the resident lives within the barangay.",
  fee: 30,
  requirements: "Valid ID, Proof of Billing",
});

upsertDocType({
  name: "Business Permit Endorsement",
  description: "Barangay endorsement required for a business permit application.",
  fee: 100,
  requirements: "Valid ID, DTI/SEC Registration, Lease Contract or Land Title",
});

console.log("Seed complete.");
console.log("Admin login:    admin@barangay.gov.ph / Admin@12345");
console.log("Staff login:    staff@barangay.gov.ph / Staff@12345");
console.log("Resident login: resident@example.com / Resident@123");
console.log({ adminId, staffId, residentId });
