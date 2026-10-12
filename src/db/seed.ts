import { DatabaseService } from './index.js';

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

  // 2. Users (Staff & Students)
  // Password hash for dev seed is a fixed test hash
  const defaultHash = 'argon2id_mock_hash_for_dev_seed';
  const users = [
    ['usr_admin', 'ADM001', 'admin@college.edu', 'System Administrator', defaultHash, 'SUPER_ADMIN', 'SYSTEM', null],
    ['usr_office', 'OFF001', 'office@college.edu', 'Hostel Office Staff', defaultHash, 'HOSTEL_OFFICE', 'SYSTEM', null],
    ['usr_chief', 'CW001', 'chiefwarden@college.edu', 'Chief Warden Dr. Sharma', defaultHash, 'CHIEF_WARDEN', 'SYSTEM', null],
    ['usr_warden_a', 'WRD001', 'wardena@college.edu', 'Warden Block A Prof. Rao', defaultHash, 'WARDEN', 'BUILDING', 'bld_aryabhata'],
    ['usr_warden_b', 'WRD002', 'wardenb@college.edu', 'Warden Block B Prof. Gupta', defaultHash, 'WARDEN', 'BUILDING', 'bld_bhaskara'],
    ['usr_proctor_1', 'PRC001', 'proctor1@college.edu', 'Dr. Mehta (Proctor)', defaultHash, 'PROCTOR', 'SYSTEM', null],
    ['usr_student_1', 'USN202401', 'student1@college.edu', 'Aarav Patel', defaultHash, 'STUDENT', 'STUDENT', null],
    ['usr_student_2', 'USN202402', 'student2@college.edu', 'Diya Sen', defaultHash, 'STUDENT', 'STUDENT', null],
    ['usr_student_3', 'USN202403', 'student3@college.edu', 'Rohan Verma', defaultHash, 'STUDENT', 'STUDENT', null],
    ['usr_student_4', 'USN202404', 'student4@college.edu', 'Ananya Iyer', defaultHash, 'STUDENT', 'STUDENT', null],
  ];

  for (const [id, cid, email, name, hash, roleName, scopeType, scopeId] of users) {
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

  // 3. Buildings (4 Initial Campus Blocks as specified)
  const buildings = [
    ['bld_aryabhata', 'BLK-A', 'Aryabhata Boys Hall', 'MALE', 4],
    ['bld_bhaskara', 'BLK-B', 'Bhaskara Boys Hall', 'MALE', 4],
    ['bld_gargi', 'BLK-C', 'Gargi Girls Hall', 'FEMALE', 4],
    ['bld_maitreyi', 'BLK-D', 'Maitreyi Girls Hall', 'FEMALE', 4],
  ];

  for (const [id, code, name, gender, floors] of buildings) {
    await db.query(
      `INSERT INTO buildings (id, code, name, gender_designation, total_floors)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
      [id, code, name, gender, floors]
    );
  }

  // 4. Floors, Rooms and Seats for Block A
  for (let f = 1; f <= 2; f++) {
    const floorId = `flr_aryabhata_${f}`;
    await db.query(
      `INSERT INTO floors (id, building_id, floor_number, label)
       VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
      [floorId, 'bld_aryabhata', f, `Floor ${f}`]
    );

    // Initial floor plan geometry
    const geometry = {
      version: 1,
      unit: 'cm',
      bounds: [0, 0, 3000, 1500],
      elements: [
        { t: 'wall', pts: [[0, 0], [3000, 0]] },
        { t: 'wall', pts: [[3000, 0], [3000, 1500]] },
        { t: 'wall', pts: [[3000, 1500], [0, 1500]] },
        { t: 'wall', pts: [[0, 1500], [0, 0]] },
        { t: 'corridor', pts: [[0, 600], [3000, 600], [3000, 900], [0, 900]] },
        { t: 'fixture', kind: 'stairs', poly: [[0, 0], [400, 0], [400, 400], [0, 400]] },
        { t: 'fixture', kind: 'washroom', poly: [[2600, 0], [3000, 0], [3000, 400], [2600, 400]] },
      ]
    };

    await db.query(
      `INSERT INTO floor_maps (id, floor_id, version, status, geometry_json)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
      [`map_${floorId}`, floorId, 1, 'PUBLISHED', JSON.stringify(geometry)]
    );

    // Create 4 rooms per floor
    for (let r = 1; r <= 4; r++) {
      const roomNum = `${f}0${r}`;
      const roomId = `rm_aryabhata_${roomNum}`;
      await db.query(
        `INSERT INTO rooms (id, floor_id, room_number, capacity, room_type, eligible_academic_years)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
        [roomId, floorId, roomNum, 2, 'DOUBLE', 'ALL']
      );

      // Seats A & B
      for (const sLabel of ['A', 'B']) {
        const seatId = `st_${roomId}_${sLabel}`;
        await db.query(
          `INSERT INTO seats (id, room_id, seat_label, status)
           VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING`,
          [seatId, roomId, sLabel, 'ACTIVE']
        );
      }
    }
  }

  // 5. Students
  const students = [
    ['prof_stu_1', 'usr_student_1', 'USN202401', 'Aarav Patel', 2, 'CSE', 'MALE', 'GENERAL', 'ELIGIBLE', 'usr_proctor_1'],
    ['prof_stu_2', 'usr_student_2', 'USN202402', 'Diya Sen', 2, 'ECE', 'FEMALE', 'MERIT', 'ELIGIBLE', 'usr_proctor_1'],
    ['prof_stu_3', 'usr_student_3', 'USN202403', 'Rohan Verma', 2, 'MECH', 'MALE', 'GENERAL', 'ELIGIBLE', 'usr_proctor_1'],
    ['prof_stu_4', 'usr_student_4', 'USN202404', 'Ananya Iyer', 3, 'CSE', 'FEMALE', 'GENERAL', 'PENDING', 'usr_proctor_1'],
  ];

  for (const [id, uid, cid, name, year, dept, gender, quota, status, proctor] of students) {
    await db.query(
      `INSERT INTO student_profiles (id, user_id, college_id, full_name, academic_year, department, gender, quota_category, eligibility_status, proctor_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING`,
      [id, uid, cid, name, year, dept, gender, quota, status, proctor]
    );
  }

  // 6. Allocation Cycle (READY for selection turns)
  const cycleId = 'cyc_fall_2026';
  await db.query(
    `INSERT INTO allocation_cycles (id, name, academic_year, status, turn_duration_seconds, waiting_room_threshold)
     VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
    [cycleId, 'Fall 2026 Academic Allocation', 2, 'READY', 120, 2] // Lower threshold to 2 for test verification
  );

  const poolId = 'pool_yr2_general';
  await db.query(
    `INSERT INTO allocation_pools (id, cycle_id, name, quota_category, academic_year)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
    [poolId, cycleId, 'Year 2 General Pool', 'GENERAL', 2]
  );
}
