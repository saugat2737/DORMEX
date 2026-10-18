import { DatabaseService, getDatabaseService } from '../src/db/index.js';
import { runMigrations } from '../src/db/schema.js';
import { seedDatabase } from '../src/db/seed.js';

export interface VirtualStudentOptions {
  count?: number;
  branches?: string[];
  startCode?: number;
  academicYear?: number;
  genderRatio?: number; // 0.0 to 1.0 female ratio
}

export interface GeneratedVirtualStudent {
  userId: string;
  collegeId: string;
  fullName: string;
  email: string;
  department: string;
  gender: string;
  quotaCategory: string;
  assignedPriority: number;
  feeStatus: string;
  feeReceiptRef: string;
  feePaymentTimestamp: string;
  eligibilityStatus: string;
}

const FIRST_NAMES_MALE = [
  'Aarav', 'Rohan', 'Vivaan', 'Ishaan', 'Kabir', 'Arjun', 'Reyansh', 'Dev', 
  'Atharv', 'Siddharth', 'Aditya', 'Kunal', 'Manish', 'Varun', 'Harsh', 'Nikhil',
  'Pranav', 'Samar', 'Tushar', 'Dhruv', 'Yash', 'Rishi', 'Karan', 'Ayush'
];

const FIRST_NAMES_FEMALE = [
  'Diya', 'Ananya', 'Aditi', 'Saanvi', 'Meera', 'Anika', 'Pooja', 'Tanvi',
  'Tara', 'Neha', 'Kavya', 'Shruti', 'Rhea', 'Prisha', 'Sneha', 'Isha',
  'Ritu', 'Simran', 'Nandini', 'Bhavna', 'Trisha', 'Megha', 'Kriti', 'Avani'
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Verma', 'Iyer', 'Gupta', 'Nair', 'Rao', 'Sen', 'Kulkarni',
  'Menon', 'Deshmukh', 'Bhat', 'Reddy', 'Joshi', 'Hegde', 'Naik', 'Pillai',
  'Roy', 'Mukherjee', 'Das', 'Bansal', 'Chadha', 'Singhania', 'Kapoor', 'Mehra',
  'Sethi', 'Chopra', 'Pandey', 'Saxena', 'Kumar'
];

const VALID_BRANCHES = ['cs', 'is', 'ec', 'ee', 'me', 'cv', 'ai', 'bt'];

/**
 * Generates an institutional USN conforming strictly to pattern:
 * 1si25<2 letters of branch><3dig code>
 * Example: 1si25cs001, 1si25ec042
 */
export function generateUsn(branch: string, code: number): string {
  const cleanBranch = branch.trim().toLowerCase().slice(0, 2);
  const padCode = String(code).padStart(3, '0');
  return `1si25${cleanBranch}${padCode}`;
}

/**
 * Validates USN against regex: /^1si25[a-z]{2}\d{3}$/i
 */
export function validateUsnStructure(usn: string): boolean {
  return /^1si25[a-z]{2}\d{3}$/i.test(usn);
}

/**
 * Generates virtual student records with deterministic USNs and realistic profiles
 */
export function generateVirtualStudents(options: VirtualStudentOptions = {}): GeneratedVirtualStudent[] {
  const count = options.count ?? 50;
  const branches = options.branches ?? VALID_BRANCHES;
  const startCode = options.startCode ?? 1;
  const academicYear = options.academicYear ?? 2;

  const students: GeneratedVirtualStudent[] = [];

  for (let i = 0; i < count; i++) {
    const codeNum = startCode + i;
    const branch = branches[i % branches.length];
    const usn = generateUsn(branch, codeNum);
    
    const isFemale = (i % 3 === 0);
    const firstNameList = isFemale ? FIRST_NAMES_FEMALE : FIRST_NAMES_MALE;
    const firstName = firstNameList[i % firstNameList.length];
    const lastName = LAST_NAMES[(i * 3 + 7) % LAST_NAMES.length];
    const fullName = `${firstName} ${lastName}`;
    const email = `${usn.toLowerCase()}@college.edu`;
    const department = branch.toUpperCase();
    const gender = isFemale ? 'FEMALE' : 'MALE';
    
    // Quota distribution: Top 10% Merit, special quota at 15/25, remainder General
    const quotaCategory = i < Math.ceil(count * 0.1) 
      ? 'MERIT' 
      : (i === 15 ? 'SPORTS' : (i === 25 ? 'PWD' : 'GENERAL'));
    
    // Eligibility: First 90% verified & eligible, rest pending to simulate admin verification desk
    const isEligible = i < Math.floor(count * 0.9);
    const feeStatus = isEligible ? 'VERIFIED' : (i % 2 === 0 ? 'SUBMITTED' : 'UNPAID');
    const eligibilityStatus = isEligible ? 'ELIGIBLE' : (feeStatus === 'SUBMITTED' ? 'PENDING' : 'FEE_PENDING');
    
    // Payment timestamp chronologically matches priority ordering
    const paymentDate = new Date(Date.UTC(2026, 7, 10, 8, Math.floor(i / 2), (i % 60)));
    const feePaymentTimestamp = paymentDate.toISOString();
    const feeReceiptRef = `REC-2026-${branch.toUpperCase()}-${String(codeNum).padStart(3, '0')}`;
    const assignedPriority = i + 1;

    students.push({
      userId: `usr_${usn.toLowerCase()}`,
      collegeId: usn,
      fullName,
      email,
      department,
      gender,
      quotaCategory,
      assignedPriority,
      feeStatus,
      feeReceiptRef,
      feePaymentTimestamp,
      eligibilityStatus
    });
  }

  return students;
}

/**
 * Seeds virtual student dataset into the target database with transactional safety
 */
export async function seedVirtualStudentsIntoDb(
  db: DatabaseService, 
  students: GeneratedVirtualStudent[]
): Promise<{ inserted: number; errors: string[] }> {
  const defaultHash = 'argon2id_mock_hash_for_virtual_test';
  const errors: string[] = [];
  let inserted = 0;

  // Retrieve student role ID
  const roleRes = await db.query(`SELECT id FROM roles WHERE name = 'STUDENT'`);
  if (roleRes.rows.length === 0) {
    throw new Error('Role STUDENT not found in database. Seed baseline schema first.');
  }
  const studentRoleId = roleRes.rows[0].id;

  for (const s of students) {
    try {
      const profileId = `prof_${s.collegeId.toLowerCase()}`;
      
      // 1. Insert user
      await db.query(
        `INSERT INTO users (id, college_id, email, full_name, password_hash)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO UPDATE 
           SET college_id = EXCLUDED.college_id,
               full_name = EXCLUDED.full_name`,
        [s.userId, s.collegeId, s.email, s.fullName, defaultHash]
      );

      // 2. Insert user role
      await db.query(
        `INSERT INTO user_roles (id, user_id, role_id, scope_type, scope_id)
         VALUES ($1, $2, $3, 'STUDENT', NULL)
         ON CONFLICT (id) DO NOTHING`,
        [`ur_${s.userId}`, s.userId, studentRoleId]
      );

      // 3. Insert student profile
      await db.query(
        `INSERT INTO student_profiles (
          id, user_id, college_id, full_name, academic_year, department, gender, quota_category, 
          eligibility_status, assigned_priority, proctor_user_id, proctor_name, proctor_department,
          parent_name, parent_relationship, parent_phone, parent_email,
          local_guardian_name, local_guardian_relationship, local_guardian_phone,
          fee_status, fee_receipt_ref, fee_payment_timestamp, fee_verified_by, fee_verified_at,
          priority_assignment_source, profile_submitted, profile_submitted_at
        ) VALUES (
          $1, $2, $3, $4, 2, $5, $6, $7, 
          $8, $9, 'usr_proctor_1', 'Dr. Mehta', 'Engineering',
          'Guardian of ' || $4, 'PARENT', '+91 9876543210', 'parent.' || $2 || '@example.com',
          'Local Contact', 'GUARDIAN', '+91 9876543211',
          $10, $11, $12, CASE WHEN $10 = 'VERIFIED' THEN 'usr_office' ELSE NULL END, 
          CASE WHEN $10 = 'VERIFIED' THEN CURRENT_TIMESTAMP ELSE NULL END,
          'PAYMENT_CHRONOLOGY', TRUE, CURRENT_TIMESTAMP
        )
        ON CONFLICT (id) DO UPDATE 
          SET assigned_priority = EXCLUDED.assigned_priority, 
              eligibility_status = EXCLUDED.eligibility_status,
              fee_status = EXCLUDED.fee_status,
              fee_receipt_ref = EXCLUDED.fee_receipt_ref,
              fee_payment_timestamp = EXCLUDED.fee_payment_timestamp`,
        [
          profileId,
          s.userId,
          s.collegeId,
          s.fullName,
          s.department,
          s.gender,
          s.quotaCategory,
          s.eligibilityStatus,
          s.assignedPriority,
          s.feeStatus,
          s.feeReceiptRef,
          s.feePaymentTimestamp
        ]
      );

      // 4. Seed Terms Acknowledgement for verified students
      if (s.feeStatus === 'VERIFIED') {
        await db.query(
          `INSERT INTO terms_acknowledgements (id, student_id, terms_document_id, terms_version, accepted_at)
           VALUES ($1, $2, 'terms_v1', 1, CURRENT_TIMESTAMP)
           ON CONFLICT (student_id, terms_version) DO NOTHING`,
          [`ack_${profileId}_v1`, profileId]
        );
      }

      inserted++;
    } catch (err: any) {
      errors.push(`Failed to insert student ${s.collegeId}: ${err.message}`);
    }
  }

  return { inserted, errors };
}

// Standalone CLI Execution when invoked via node/tsx
const isMain = process.argv[1] && (
  process.argv[1].endsWith('generateVirtualData.ts') || 
  process.argv[1].endsWith('generateVirtualData.js')
);

if (isMain) {
  (async () => {
    console.log('='.repeat(70));
    console.log(' DORMEX Virtual Student Dataset Generator & Test Logger');
    console.log(' USN Format Enforcement: 1si25<branch 2-letters><3-digit code>');
    console.log('='.repeat(70));

    const countArg = parseInt(process.argv[2], 10) || 50;
    console.log(`\nGenerating ${countArg} virtual students...`);
    
    const virtualStudents = generateVirtualStudents({ count: countArg });
    
    // Log sample table of virtual data for verification
    console.log('\n--- Virtual Student Data Samples (First 10) ---');
    console.table(
      virtualStudents.slice(0, 10).map((s) => ({
        USN: s.collegeId,
        Name: s.fullName,
        Branch: s.department,
        Gender: s.gender,
        Priority: `#${s.assignedPriority}`,
        Fee: s.feeStatus,
        Eligibility: s.eligibilityStatus,
        ValidUSN: validateUsnStructure(s.collegeId) ? '✓ YES' : '✗ NO'
      }))
    );

    console.log('\nConnecting to database...');
    const db = getDatabaseService();
    try {
      console.log('Running schema migrations...');
      await runMigrations(db);
      console.log('Baseline schema ready. Seeding core seed data...');
      await seedDatabase(db);
      console.log('Seeding virtual students...');
      const result = await seedVirtualStudentsIntoDb(db, virtualStudents);
      console.log(`\n✓ Successfully inserted/synchronized ${result.inserted} virtual students into database.`);
      if (result.errors.length > 0) {
        console.warn(`Warnings/Errors encountered: ${result.errors.length}`);
        console.warn(result.errors.slice(0, 5));
      }
      console.log('\nAll virtual students are authenticated and ready for simulation, waiting room, or turn allocation!');
    } catch (err: any) {
      console.error('Database connection or seeding failed:', err);
    } finally {
      await db.close();
    }
  })();
}
