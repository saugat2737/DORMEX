import { DatabaseService } from './index.js';
import { bvbRooms } from '../inventory/bvbRooms.js';

export async function seedDatabase(db: DatabaseService): Promise<void> {
  // 1. Roles
  const roles = [
    ['role_student', 'STUDENT', 'Student resident'],
    ['role_proctor', 'PROCTOR', 'Faculty proctor'],
    ['role_warden', 'WARDEN', 'Building Warden'],
    ['role_chief_warden', 'CHIEF_WARDEN', 'Chief Warden across all hostels'],
    ['role_hostel_office', 'HOSTEL_OFFICE', 'Hostel Office Administrator'],
    ['role_super_admin', 'SUPER_ADMIN', 'Super Administrator with system override'],
  ];

  for (const [id, name, desc] of roles) {
    await db.query(
      `INSERT INTO roles (id, name, description) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [id, name, desc]
    );
  }

  // 2. Staff Users & Test Identities
  const defaultHash = 'argon2id_mock_hash_for_dev_seed';
  const staffUsers = [
    ['usr_admin', 'ADM001', 'admin@college.edu', 'System Administrator', defaultHash, 'SUPER_ADMIN', 'SYSTEM', null],
    ['usr_office', 'OFF001', 'office@college.edu', 'Hostel Office Staff', defaultHash, 'HOSTEL_OFFICE', 'SYSTEM', null],
    ['usr_chief', 'CW001', 'chiefwarden@college.edu', 'Chief Warden Dr. Sharma', defaultHash, 'CHIEF_WARDEN', 'SYSTEM', null],
    ['usr_warden_bvb', 'WRD001', 'warden.bvb@college.edu', 'Prof. Rao (Warden - BVB Block)', defaultHash, 'WARDEN', 'BUILDING', 'bld_bvb'],
    ['usr_proctor_1', 'PRC001', 'proctor1@college.edu', 'Dr. Mehta (Proctor)', defaultHash, 'PROCTOR', 'SYSTEM', null],
  ];

  for (const [id, cid, email, name, hash, roleName, scopeType, scopeId] of staffUsers) {
    await db.query(
      `INSERT INTO users (id, college_id, email, full_name, password_hash)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
      [id, cid, email, name, hash]
    );

    const roleRes = await db.query(`SELECT id FROM roles WHERE name = $1`, [roleName]);
    const roleId = roleRes.rows[0].id;

    await db.query(
      `INSERT INTO user_roles (id, user_id, role_id, scope_type, scope_id)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
      [`ur_${id}`, id, roleId, scopeType, scopeId]
    );
  }

  // 2b. Published Terms & Conditions Document (Version 1)
  const termsText = `### DORMEX College Hostel Room Responsibility & Allocation Agreement
(Approved College Policy - Pilot Version 1)

1. **Room & Property Responsibility**:
Each admitted student is responsible for the assigned room, cot, study desk, chair, wardrobe, fixtures, electrical fittings, and keys. Any pre-existing damage must be documented within 48 hours of move-in.

2. **Responsible Use & Code of Conduct**:
Hostel facilities must be used responsibly. Unauthorized alteration of electrical fittings, damage to walls or furniture, and subletting or swapping of beds without official written approval are strictly prohibited.

3. **Maintenance & Repairs**:
All maintenance issues and repair needs must be reported promptly via the DORMEX Complaint Desk. Negligence resulting in property damage may lead to institutional repair recovery as per approved college regulations.

4. **Allocation & Roommate Acknowledgement**:
Preference submission and roommate group coordination do not guarantee a specific room or seat. Allocation decisions are deterministic based on verified fee priority and institutional quota policies.

5. **Room Change & Vacating Policy**:
Students who wish to request a room change must apply within the official 48-hour post-allocation change window. Room moves are subject to verified availability and administrative approval.`;

  await db.query(
    `INSERT INTO terms_documents (id, version, title, content, content_hash, is_published, published_by)
     VALUES ($1, $2, $3, $4, $5, TRUE, 'usr_admin')
     ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content, is_published = TRUE`,
    ['terms_v1', 1, 'Hostel Room Responsibility & Allocation Agreement (2026-27)', termsText, 'hash_terms_v1_pilot']
  );

  // 3. Exactly 30 Synthetic Demo Students (DEMO-001 through DEMO-030)
  // Non-real names, reproducible seed priority 1..30, Year 2 General/Merit for Fall 2026 pilot cycle
  const syntheticNames = [
    'Aarav Sharma', 'Diya Patel', 'Rohan Verma', 'Ananya Iyer', 'Vivaan Gupta',
    'Ishaan Nair', 'Aditi Rao', 'Kabir Sen', 'Saanvi Kulkarni', 'Arjun Menon',
    'Meera Deshmukh', 'Reyansh Bhat', 'Anika Reddy', 'Dev Joshi', 'Pooja Hegde',
    'Atharv Naik', 'Tanvi Pillai', 'Siddharth Roy', 'Tara Mukherjee', 'Aditya Das',
    'Neha Bansal', 'Kunal Chadha', 'Kavya Singhania', 'Manish Kapoor', 'Shruti Mehra',
    'Varun Sethi', 'Rhea Chopra', 'Harsh Varma', 'Prisha Pandey', 'Nikhil Saxena'
  ];

  const studentRoleRes = await db.query(`SELECT id FROM roles WHERE name = 'STUDENT'`);
  const studentRoleId = studentRoleRes.rows[0].id;

  for (let i = 1; i <= 30; i++) {
    const pad = String(i).padStart(3, '0');
    const collegeId = `DEMO-${pad}`;
    const userId = `usr_demo_${pad}`;
    const profileId = `prof_demo_${pad}`;
    const fullName = syntheticNames[i - 1];
    const email = `demo.${pad.toLowerCase()}@college.edu`;
    const quota = i <= 5 ? 'MERIT' : (i === 12 ? 'SPORTS' : (i === 20 ? 'PWD' : 'GENERAL'));
    // Demo eligibility: first 28 are ELIGIBLE, 29 is PENDING, 30 is FEE_PENDING to demonstrate staff verification
    const eligibility = i <= 28 ? 'ELIGIBLE' : (i === 29 ? 'PENDING' : 'FEE_PENDING');
    const priority = i; // Authoritative priority 1..30
    const feeStatus = i <= 28 ? 'VERIFIED' : (i === 29 ? 'SUBMITTED' : 'UNPAID');
    const feeRef = i <= 29 ? `FEE-2026-BVB-${pad}` : null;
    const feeTimestamp = i <= 29 ? new Date(Date.UTC(2026, 7, 10, 9, i, 0)).toISOString() : null;
    const verifiedBy = i <= 28 ? 'usr_office' : null;
    const verifiedAt = i <= 28 ? new Date(Date.UTC(2026, 7, 10, 12, 0, 0)).toISOString() : null;

    await db.query(
      `INSERT INTO users (id, college_id, email, full_name, password_hash)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
      [userId, collegeId, email, fullName, defaultHash]
    );

    await db.query(
      `INSERT INTO user_roles (id, user_id, role_id, scope_type, scope_id)
       VALUES ($1, $2, $3, 'STUDENT', NULL) ON CONFLICT (id) DO NOTHING`,
      [`ur_${userId}`, userId, studentRoleId]
    );

    await db.query(
      `INSERT INTO student_profiles (
        id, user_id, college_id, full_name, academic_year, department, gender, quota_category, 
        eligibility_status, assigned_priority, proctor_user_id, proctor_name, proctor_department,
        parent_name, parent_relationship, parent_phone, parent_email,
        local_guardian_name, local_guardian_relationship, local_guardian_phone,
        fee_status, fee_receipt_ref, fee_payment_timestamp, fee_verified_by, fee_verified_at,
        priority_assignment_source, profile_submitted, profile_submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
      ON CONFLICT (id) DO UPDATE 
        SET assigned_priority = EXCLUDED.assigned_priority, 
            eligibility_status = EXCLUDED.eligibility_status,
            fee_status = EXCLUDED.fee_status,
            fee_receipt_ref = EXCLUDED.fee_receipt_ref,
            fee_payment_timestamp = EXCLUDED.fee_payment_timestamp`,
      [
        profileId,
        userId,
        collegeId,
        fullName,
        2, // Academic Year 2
        i % 2 === 0 ? 'CSE' : 'ECE',
        i % 3 === 0 ? 'FEMALE' : 'MALE',
        quota,
        eligibility,
        priority,
        'usr_proctor_1',
        'Dr. Mehta',
        'Computer Science',
        `Parent of ${fullName}`,
        'Father',
        `+91 98765 432${pad.slice(-2)}`,
        `parent.${pad.toLowerCase()}@example.com`,
        `Guardian of ${fullName}`,
        'Uncle',
        `+91 91234 567${pad.slice(-2)}`,
        feeStatus,
        feeRef,
        feeTimestamp,
        verifiedBy,
        verifiedAt,
        'AUTOMATIC_FEE',
        true,
        new Date(Date.UTC(2026, 7, 10, 8, 30, 0)).toISOString()
      ]
    );

    // Seed terms acknowledgement for demo students 1..28
    if (i <= 28) {
      await db.query(
        `INSERT INTO terms_acknowledgements (id, student_id, terms_document_id, terms_version, accepted_at)
         VALUES ($1, $2, 'terms_v1', 1, $3)
         ON CONFLICT (student_id, terms_version) DO NOTHING`,
        [`ack_demo_${pad}_v1`, profileId, new Date(Date.UTC(2026, 7, 10, 8, 45, 0)).toISOString()]
      );
    }
  }

  // Backward compatibility alias for tests targeting usr_student_1..4
  const testAliases = [
    ['usr_student_1', 'prof_stu_1', 'USN202401', 'Aarav Sharma (Demo 1)', 'usr_demo_001', 'prof_demo_001'],
    ['usr_student_2', 'prof_stu_2', 'USN202402', 'Diya Patel (Demo 2)', 'usr_demo_002', 'prof_demo_002'],
    ['usr_student_3', 'prof_stu_3', 'USN202403', 'Rohan Verma (Demo 3)', 'usr_demo_003', 'prof_demo_003'],
    ['usr_student_4', 'prof_stu_4', 'USN202404', 'Ananya Iyer (Demo 4)', 'usr_demo_004', 'prof_demo_004'],
  ];

  for (const [uid, pid, cid, name] of testAliases) {
    await db.query(
      `INSERT INTO users (id, college_id, email, full_name, password_hash)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
      [uid, cid, `${uid}@college.edu`, name, defaultHash]
    );
    await db.query(
      `INSERT INTO user_roles (id, user_id, role_id, scope_type, scope_id)
       VALUES ($1, $2, $3, 'STUDENT', NULL) ON CONFLICT (id) DO NOTHING`,
      [`ur_${uid}`, uid, studentRoleId]
    );
    await db.query(
      `INSERT INTO student_profiles (
        id, user_id, college_id, full_name, academic_year, department, gender, quota_category, eligibility_status, assigned_priority, proctor_user_id,
        fee_status, fee_receipt_ref, fee_payment_timestamp, fee_verified_at, profile_submitted
      ) VALUES ($1, $2, $3, $4, 2, 'CSE', 'MALE', 'GENERAL', 'ELIGIBLE', NULL, 'usr_proctor_1', 'VERIFIED', 'FEE-ALIAS-1', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, TRUE) 
      ON CONFLICT (id) DO UPDATE SET eligibility_status = 'ELIGIBLE', fee_status = 'VERIFIED'`,
      [pid, uid, cid, name]
    );

    // Seed terms acknowledgement for test alias
    await db.query(
      `INSERT INTO terms_acknowledgements (id, student_id, terms_document_id, terms_version, accepted_at)
       VALUES ($1, $2, 'terms_v1', 1, CURRENT_TIMESTAMP)
       ON CONFLICT (student_id, terms_version) DO NOTHING`,
      [`ack_${pid}_v1`, pid]
    );
  }

  // 4. Pilot Building: BVB Block (ONE Building)
  const buildingId = 'bld_bvb';
  await db.query(
    `INSERT INTO buildings (id, code, name, gender_designation, total_floors, is_active)
     VALUES ($1, $2, $3, $4, $5, TRUE) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
    [buildingId, 'BVB', 'BVB Block', 'COED', 4]
  );

  // Backward compatibility alias building for existing tests if queried
  await db.query(
    `INSERT INTO buildings (id, code, name, gender_designation, total_floors, is_active)
     VALUES ('bld_aryabhata', 'BLK-A', 'BVB Block (Legacy Ref)', 'COED', 4, TRUE) ON CONFLICT (id) DO NOTHING`
  );

  // 5. Floor 2 (bvb-floor-2.svg geometry)
  const floorId = 'flr_bvb_2';
  await db.query(
    `INSERT INTO floors (id, building_id, floor_number, label)
     VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
    [floorId, buildingId, 2, 'Floor 2']
  );

  // Alias floor for tests
  await db.query(
    `INSERT INTO floors (id, building_id, floor_number, label)
     VALUES ('flr_aryabhata_1', 'bld_aryabhata', 1, 'Floor 1 (Test Alias)') ON CONFLICT (id) DO NOTHING`
  );
  await db.query(
    `INSERT INTO floors (id, building_id, floor_number, label)
     VALUES ('flr_aryabhata_2', 'bld_aryabhata', 2, 'Floor 2 (Test Alias)') ON CONFLICT (id) DO NOTHING`
  );

  // Prepare Floor Map geometry from supplied SVG source
  const geometryElements: any[] = [
    // Outer building frame & corridors from bvb-floor-2.svg viewBox 900x650
    { t: 'wall', pts: [[50, 50], [850, 50]] },
    { t: 'wall', pts: [[850, 50], [850, 600]] },
    { t: 'wall', pts: [[850, 600], [50, 600]] },
    { t: 'wall', pts: [[50, 600], [50, 50]] },
    { t: 'corridor', pts: [[110, 50], [790, 50], [790, 120], [110, 120]] },
    { t: 'corridor', pts: [[110, 530], [790, 530], [790, 600], [110, 600]] },
    { t: 'corridor', pts: [[50, 120], [110, 120], [110, 530], [50, 530]] },
    { t: 'corridor', pts: [[790, 120], [850, 120], [850, 530], [790, 530]] },
    { t: 'corridor', pts: [[430, 140], [470, 140], [470, 500], [430, 500]] },
    { t: 'fixture', kind: 'stairs', poly: [[50, 50], [110, 50], [110, 120], [50, 120]] },
    { t: 'fixture', kind: 'washroom', poly: [[790, 50], [850, 50], [850, 120], [790, 120]] },
  ];

  // 6. Seed Rooms and provisional seat inventory
  // SVG contains 72 rooms numbered 201 to 272.
  // Capacity:
  // - Type 1 (e.g. 262): Single Bed (A)
  // - Type 2 (222-251): Double Bed (A, B)
  // - Type 3 (201-221, 252-272): Triple Bed (A, B, C)
  // This yields explicit, separate seat records. Capacities are marked as provisional demo data.
  for (const r of bvbRooms) {
    const roomId = `rm_bvb_${r.roomNumber}`;
    const capacity = parseInt(r.typeCode, 10) || 2;
    const roomType = capacity === 1 ? 'SINGLE' : (capacity === 2 ? 'DOUBLE' : 'TRIPLE');

    await db.query(
      `INSERT INTO rooms (id, floor_id, room_number, capacity, room_type, eligible_academic_years, is_blocked)
       VALUES ($1, $2, $3, $4, $5, 'ALL', FALSE) ON CONFLICT (id) DO NOTHING`,
      [roomId, floorId, r.roomNumber, capacity, roomType]
    );

    // Map geometry element for room
    geometryElements.push({
      t: 'room',
      id: roomId,
      label: r.roomNumber,
      poly: [
        [r.x, r.y],
        [r.x + r.width, r.y],
        [r.x + r.width, r.y + r.height],
        [r.x, r.y + r.height]
      ],
      meta: {
        capacity,
        typeCode: r.typeCode,
        provisional: true
      }
    });

    // Create seat records inside room (A, B, C...)
    const labels = ['A', 'B', 'C'].slice(0, capacity);
    for (let sIdx = 0; sIdx < labels.length; sIdx++) {
      const sLabel = labels[sIdx];
      const seatId = `st_${roomId}_${sLabel}`;
      await db.query(
        `INSERT INTO seats (id, room_id, seat_label, status)
         VALUES ($1, $2, $3, 'ACTIVE') ON CONFLICT (id) DO NOTHING`,
        [seatId, roomId, sLabel]
      );

      // Seat geometry position inside room
      const seatW = Math.max(8, r.width / (capacity + 0.5));
      const seatH = Math.max(8, r.height * 0.7);
      const seatX = r.x + 2 + sIdx * (seatW + 2);
      const seatY = r.y + 2;

      geometryElements.push({
        t: 'seat',
        id: seatId,
        label: sLabel,
        pos: [seatX, seatY],
        size: [seatW, seatH],
        meta: { roomId, provisional: true }
      });
    }
  }

  // Publish Floor Map
  const floorMapGeometry = {
    version: 1,
    unit: 'px',
    bounds: [0, 0, 900, 650],
    elements: geometryElements
  };

  await db.query(
    `INSERT INTO floor_maps (id, floor_id, version, status, geometry_json)
     VALUES ($1, $2, 1, 'PUBLISHED', $3) ON CONFLICT (id) DO UPDATE SET geometry_json = EXCLUDED.geometry_json`,
    [`map_${floorId}`, floorId, JSON.stringify(floorMapGeometry)]
  );
  // Also seed alias map for tests
  await db.query(
    `INSERT INTO floor_maps (id, floor_id, version, status, geometry_json)
     VALUES ('map_flr_aryabhata_1', 'flr_aryabhata_1', 1, 'PUBLISHED', $1) ON CONFLICT (id) DO NOTHING`,
    [JSON.stringify(floorMapGeometry)]
  );

  // Also seed test seats for tests (rm_aryabhata_101_A/B, 102)
  await db.query(
    `INSERT INTO rooms (id, floor_id, room_number, capacity, room_type)
     VALUES ('rm_aryabhata_101', 'flr_aryabhata_1', '101', 2, 'DOUBLE') ON CONFLICT (id) DO NOTHING`
  );
  await db.query(
    `INSERT INTO rooms (id, floor_id, room_number, capacity, room_type)
     VALUES ('rm_aryabhata_102', 'flr_aryabhata_1', '102', 2, 'DOUBLE') ON CONFLICT (id) DO NOTHING`
  );
  await db.query(
    `INSERT INTO seats (id, room_id, seat_label, status)
     VALUES ('st_rm_aryabhata_101_A', 'rm_aryabhata_101', 'A', 'ACTIVE') ON CONFLICT (id) DO NOTHING`
  );
  await db.query(
    `INSERT INTO seats (id, room_id, seat_label, status)
     VALUES ('st_rm_aryabhata_101_B', 'rm_aryabhata_101', 'B', 'ACTIVE') ON CONFLICT (id) DO NOTHING`
  );

  // 7. Pilot Allocation Cycle (BVB Block Floor 2 Pilot)
  // Threshold configured to 30 (pilot size) with staff manual early start capability
  const cycleId = 'cyc_bvb_pilot_2026';
  await db.query(
    `INSERT INTO allocation_cycles (
      id, name, academic_year, status, turn_duration_seconds, waiting_room_threshold, late_grace_seconds, max_penalty_turns,
      room_change_enabled, room_change_window_hours, results_published_at
    ) VALUES ($1, $2, 2, 'READY', 120, 30, 360, 10, TRUE, 48, CURRENT_TIMESTAMP) ON CONFLICT (id) DO UPDATE 
      SET waiting_room_threshold = 30, status = 'READY', room_change_enabled = TRUE, room_change_window_hours = 48`,
    [cycleId, 'BVB Block Floor 2 Pilot Allocation (30 Students)']
  );

  // Allocation pools for pilot cycle (GENERAL, MERIT, SPORTS, PWD)
  const quotas = ['GENERAL', 'MERIT', 'SPORTS', 'PWD'];
  for (const q of quotas) {
    const pId = `pool_bvb_yr2_${q.toLowerCase()}`;
    await db.query(
      `INSERT INTO allocation_pools (id, cycle_id, name, quota_category, academic_year)
       VALUES ($1, $2, $3, $4, 2) ON CONFLICT (id) DO NOTHING`,
      [pId, cycleId, `BVB Floor 2 ${q} Pool`, q]
    );
  }

  // Also keep cyc_fall_2026 alias for legacy tests
  await db.query(
    `INSERT INTO allocation_cycles (id, name, academic_year, status, turn_duration_seconds, waiting_room_threshold)
     VALUES ('cyc_fall_2026', 'Fall 2026 Academic Allocation', 2, 'READY', 120, 2) ON CONFLICT (id) DO NOTHING`
  );
  await db.query(
    `INSERT INTO allocation_pools (id, cycle_id, name, quota_category, academic_year)
     VALUES ('pool_yr2_general', 'cyc_fall_2026', 'Year 2 General Pool', 'GENERAL', 2) ON CONFLICT (id) DO NOTHING`
  );
}
