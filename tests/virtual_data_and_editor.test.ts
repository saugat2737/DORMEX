import { describe, it, expect, beforeAll } from 'vitest';
import { 
  generateUsn, 
  validateUsnStructure, 
  generateVirtualStudents, 
  seedVirtualStudentsIntoDb 
} from '../scripts/generateVirtualData.js';
import { getDatabaseService } from '../src/db/index.js';
import { runMigrations } from '../src/db/schema.js';
import { seedDatabase } from '../src/db/seed.js';

describe('Virtual Data Generator & Floor Plan Architecture Suite', () => {
  const db = getDatabaseService();

  beforeAll(async () => {
    await runMigrations(db);
    await seedDatabase(db);
  }, 30000);

  describe('1. Institutional USN Structure Invariants (1si25<branch 2-char><3-digit>)', () => {
    it('generates strictly formatted USNs conforming to 1si25<branch><3digit>', () => {
      expect(generateUsn('cs', 1)).toBe('1si25cs001');
      expect(generateUsn('EC', 42)).toBe('1si25ec042');
      expect(generateUsn('ME', 123)).toBe('1si25me123');
      expect(generateUsn('AI', 5)).toBe('1si25ai005');
      expect(generateUsn('IS', 999)).toBe('1si25is999');
    });

    it('validates USN structure accurately using regex', () => {
      expect(validateUsnStructure('1si25cs001')).toBe(true);
      expect(validateUsnStructure('1si25EC042')).toBe(true);
      expect(validateUsnStructure('1si25ai100')).toBe(true);
      
      // Invalid cases
      expect(validateUsnStructure('2si25cs001')).toBe(false); // wrong prefix
      expect(validateUsnStructure('1si24cs001')).toBe(false); // wrong year
      expect(validateUsnStructure('1si25c001')).toBe(false);  // single letter branch
      expect(validateUsnStructure('1si25cse001')).toBe(false); // 3-letter branch
      expect(validateUsnStructure('1si25cs01')).toBe(false);  // 2-digit code
      expect(validateUsnStructure('1si25cs0001')).toBe(false); // 4-digit code
    });

    it('generates reproducible virtual students with 100% valid USNs', () => {
      const students = generateVirtualStudents({ count: 20 });
      expect(students.length).toBe(20);

      for (const s of students) {
        expect(validateUsnStructure(s.collegeId)).toBe(true);
        expect(s.userId).toBe(`usr_${s.collegeId.toLowerCase()}`);
        expect(s.email).toBe(`${s.collegeId.toLowerCase()}@college.edu`);
        expect(s.assignedPriority).toBeGreaterThan(0);
        expect(s.feePaymentTimestamp).toBeDefined();
      }
    });

    it('seeds virtual student cohort into relational database without conflicts', async () => {
      const virtualBatch = generateVirtualStudents({ count: 12, startCode: 101 });
      const result = await seedVirtualStudentsIntoDb(db, virtualBatch);

      expect(result.inserted).toBe(12);
      expect(result.errors.length).toBe(0);

      // Verify in DB
      const res = await db.query(
        `SELECT college_id, full_name, eligibility_status, fee_status 
         FROM student_profiles 
         WHERE college_id LIKE '1si25%' 
         ORDER BY assigned_priority ASC`
      );
      expect(res.rows.length).toBeGreaterThanOrEqual(12);
      expect(res.rows[0].college_id).toMatch(/^1si25/);
    });
  });

  describe('2. Floor Plan Editor Architecture & BVB SVG Viewport Integrity', () => {
    it('verifies standard BVB Floor 2 map dimensions are 900x650 px', async () => {
      const mapRes = await db.query(
        `SELECT geometry_json FROM floor_maps WHERE floor_id = 'flr_bvb_2' AND status = 'PUBLISHED' LIMIT 1`
      );
      expect(mapRes.rows.length).toBe(1);
      const geometry = JSON.parse(mapRes.rows[0].geometry_json);
      expect(geometry.bounds).toEqual([0, 0, 900, 650]);
      expect(geometry.unit).toBe('px');

      // Room elements exist
      const rooms = geometry.elements.filter((e: any) => e.t === 'room');
      expect(rooms.length).toBe(72);
      expect(rooms.find((r: any) => r.label === '201')).toBeDefined();
      expect(rooms.find((r: any) => r.label === '272')).toBeDefined();
    });
  });
});
