import { describe, it, expect, beforeEach } from "vitest";
import {
  BATTLE_ASTRAS,
  calculateKingdomDefenseReduction,
  calculateBattleOutcome,
  getStructureInfo,
  upgradeStructure,
  getStudentKingdom,
  saveStudentKingdom,
  equipBattleAstra,
  purchaseBattleAstra,
  recordBattle,
  getDailyBattleFlixEarned,
  recordBattleFlixEarnings,
  DEFAULT_ASTRAVYUH_SETTINGS,
  saveAstravyuhSettings,
  startBattleSession,
  submitBattleSession,
  isBatchBattleEnabled,
  setBatchBattleStatus,
  instructorAwardFlix,
  getFlixAuditLogs,
  isAstravyuhGloballyEnabled
} from "@/services/astravyuhService";
import { getFluxBalance, setFluxBalance } from "@/services/themeService";
import { WEAPONS_CATALOG } from "@/types/weapon";
import { THEMES_CATALOG } from "@/types/theme";

describe("SINVERSE: ASTRAVYUH Core Game Engine & Security", () => {
  beforeEach(() => {
    localStorage.clear();
    setFluxBalance(1000); // Starter balance for testing
    saveAstravyuhSettings(DEFAULT_ASTRAVYUH_SETTINGS);
  });

  describe("1. Three Battle Astras Catalog & Effects", () => {
    it("should retain exactly the three specified battle Astras", () => {
      const keys = Object.keys(BATTLE_ASTRAS);
      expect(keys).toHaveLength(3);
      expect(keys).toContain("agni-astra");
      expect(keys).toContain("varuna-astra");
      expect(keys).toContain("vajra-astra");

      expect(BATTLE_ASTRAS["agni-astra"].ability).toBe("+10 attack damage");
      expect(BATTLE_ASTRAS["varuna-astra"].ability).toBe("Reduces incoming damage by 10");
      expect(BATTLE_ASTRAS["vajra-astra"].ability).toBe("+15 damage when all 5 questions are correct");
    });

    it("should apply Agni Astra bonus of +10 flat attack damage", () => {
      const res = calculateBattleOutcome({
        correctAnswers: 3, // 3 * 20 = 60
        totalQuestions: 5,
        attackerAstraId: "agni-astra",
        defenderCastleLevel: 1,
        defenderWallLevel: 1,
        defenderTowerLevel: 1,
        defenderAstraId: null
      });

      expect(res.baseAttack).toBe(60);
      expect(res.attackerAstraBonus).toBe(10);
      expect(res.totalAttackScore).toBe(70);
    });

    it("should apply Vajra Astra bonus of +15 only with a perfect 5/5 score", () => {
      const perfectRes = calculateBattleOutcome({
        correctAnswers: 5,
        totalQuestions: 5,
        attackerAstraId: "vajra-astra",
        defenderCastleLevel: 1,
        defenderWallLevel: 1,
        defenderTowerLevel: 1,
        defenderAstraId: null
      });
      expect(perfectRes.baseAttack).toBe(100);
      expect(perfectRes.attackerAstraBonus).toBe(15);
      expect(perfectRes.totalAttackScore).toBe(115);

      const imperfectRes = calculateBattleOutcome({
        correctAnswers: 4,
        totalQuestions: 5,
        attackerAstraId: "vajra-astra",
        defenderCastleLevel: 1,
        defenderWallLevel: 1,
        defenderTowerLevel: 1,
        defenderAstraId: null
      });
      expect(imperfectRes.baseAttack).toBe(80);
      expect(imperfectRes.attackerAstraBonus).toBe(0);
      expect(imperfectRes.totalAttackScore).toBe(80);
    });

    it("should apply Varuna Astra defense reduction of +10 when defending", () => {
      const noVaruna = calculateKingdomDefenseReduction(2, 2, 2, null);
      expect(noVaruna.totalDefenseReduction).toBe(10);
      expect(noVaruna.varunaBonus).toBe(0);

      const withVaruna = calculateKingdomDefenseReduction(2, 2, 2, "varuna-astra");
      expect(withVaruna.totalDefenseReduction).toBe(20);
      expect(withVaruna.varunaBonus).toBe(10);
    });

    it("enforces single Astra equip at a time", () => {
      equipBattleAstra("agni-astra");
      let kingdom = getStudentKingdom();
      expect(kingdom.equippedAstraId).toBe("agni-astra");

      purchaseBattleAstra("varuna-astra");
      equipBattleAstra("varuna-astra");
      kingdom = getStudentKingdom();
      expect(kingdom.equippedAstraId).toBe("varuna-astra");
    });

    it("allows Master Admin to configure dynamic Astra prices", () => {
      saveAstravyuhSettings({
        astraPrices: {
          "agni-astra": 180,
          "varuna-astra": 220,
          "vajra-astra": 400
        }
      });

      expect(BATTLE_ASTRAS["agni-astra"].cost).toBe(180);
      expect(BATTLE_ASTRAS["varuna-astra"].cost).toBe(220);
      expect(BATTLE_ASTRAS["vajra-astra"].cost).toBe(400);

      setFluxBalance(300);
      purchaseBattleAstra("varuna-astra");
      expect(getFluxBalance()).toBe(80); // 300 - 220
    });
  });

  describe("2. Kingdom Builder & Building Upgrades", () => {
    it("should return valid structure metadata up to Level 5", () => {
      const castleLvl1 = getStructureInfo("castle", 1);
      expect(castleLvl1.level).toBe(1);
      expect(castleLvl1.maxLevel).toBe(5);
      expect(castleLvl1.upgradeCost).toBe(100);
      expect(castleLvl1.defenseContribution).toBe(1);

      const castleLvl5 = getStructureInfo("castle", 5);
      expect(castleLvl5.level).toBe(5);
      expect(castleLvl5.upgradeCost).toBe(0);
    });

    it("should successfully upgrade building and deduct Flix atomically with audit log", () => {
      setFluxBalance(500);
      const res = upgradeStructure("castle");
      expect(res.success).toBe(true);
      expect(res.kingdom.castleLevel).toBe(2);
      expect(res.remainingFlix).toBe(400);
      expect(getFluxBalance()).toBe(400);

      const audit = getFlixAuditLogs();
      expect(audit.length).toBeGreaterThan(0);
      expect(audit[0].type).toBe("structure_upgrade");
      expect(audit[0].amount).toBe(-100);
    });

    it("should reject upgrade if student has insufficient Flix", () => {
      setFluxBalance(30);
      const res = upgradeStructure("castle");
      expect(res.success).toBe(false);
      expect(res.message).toContain("Insufficient Orbit Flix");
      expect(res.kingdom.castleLevel).toBe(1);
    });

    it("should prevent upgrading past Level 5", () => {
      const kingdom = getStudentKingdom();
      saveStudentKingdom({ ...kingdom, castleLevel: 5 });
      setFluxBalance(5000);

      const res = upgradeStructure("castle");
      expect(res.success).toBe(false);
      expect(res.message).toContain("maximum Level 5");
      expect(res.kingdom.castleLevel).toBe(5);
    });
  });

  describe("3. Authoritative Battle Sessions & Anti-Cheat", () => {
    it("never exposes correct answers in public questions sent to client", () => {
      const { publicQuestions } = startBattleSession("rival-1");
      expect(publicQuestions).toHaveLength(5);
      publicQuestions.forEach(q => {
        expect((q as any).correctAnswer).toBeUndefined();
        expect(q.id).toBeDefined();
        expect(q.questionText).toBeDefined();
        expect(q.options.length).toBeGreaterThan(1);
      });
    });

    it("authoritatively validates answers upon submission and prevents double submissions", () => {
      const { session } = startBattleSession("rival-1");
      const defender = getStudentKingdom("rival-1");

      const answers: Record<string, string> = {};
      session.questionIds.forEach((id, idx) => {
        // Submit correct or mock answers
        answers[id] = "Chain of Thought (CoT)";
      });

      const outcome = submitBattleSession(session.sessionId, answers, defender);
      expect(outcome.result).toBeDefined();
      expect(outcome.log).toBeDefined();
      expect(outcome.feedback).toHaveLength(5);

      // Attempting to submit again throws error
      expect(() => {
        submitBattleSession(session.sessionId, answers, defender);
      }).toThrow("already been completed");
    });

    it("enforces batch battle participation control", () => {
      const kingdom = getStudentKingdom();
      saveStudentKingdom({ ...kingdom, batch: "Cohort-Restricted" });

      // Disable cohort
      setBatchBattleStatus("Cohort-Restricted", false);
      expect(isBatchBattleEnabled("Cohort-Restricted")).toBe(false);

      expect(() => {
        startBattleSession("rival-1");
      }).toThrow("has been paused by instructors");

      // Re-enable cohort
      setBatchBattleStatus("Cohort-Restricted", true);
      expect(isBatchBattleEnabled("Cohort-Restricted")).toBe(true);
      expect(() => {
        startBattleSession("rival-1");
      }).not.toThrow();
    });
  });

  describe("4. Global Kill Switch & Emergency Freeze", () => {
    it("halts all battle sessions and upgrades when game is paused globally", () => {
      saveAstravyuhSettings({ gameEnabled: false });
      expect(isAstravyuhGloballyEnabled()).toBe(false);

      expect(() => {
        startBattleSession("rival-1");
      }).toThrow("currently disabled by administrators");

      const upgradeRes = upgradeStructure("wall");
      expect(upgradeRes.success).toBe(false);
      expect(upgradeRes.message).toContain("celestial maintenance");
    });
  });

  describe("5. Instructor Learning Awards & Audit Trail", () => {
    it("allows instructors to grant learning Flix up to the safe cap", () => {
      const initialFlix = getFluxBalance();
      const res = instructorAwardFlix(
        "rival-1",
        50,
        "Completed Module 1 Exam with Distinction",
        "teacher-123",
        "Alpha Cohort"
      );

      expect(res.success).toBe(true);
      expect(getFluxBalance()).toBe(initialFlix + 50);

      const logs = getFlixAuditLogs();
      const awardLog = logs.find(l => l.type === "instructor_award");
      expect(awardLog).toBeDefined();
      expect(awardLog?.amount).toBe(50);
      expect(awardLog?.details).toContain("Distinction");
    });
  });

  describe("6. LMS Protection & Non-Regression", () => {
    it("preserves historical weapons catalog and existing LMS themes intact", () => {
      // Weapon catalog remains populated and has historical entries
      expect(WEAPONS_CATALOG.length).toBeGreaterThan(10);
      expect(WEAPONS_CATALOG.some(w => w.id === "brahmashira-astra")).toBe(true);
      expect(WEAPONS_CATALOG.some(w => w.id === "pashupatastra")).toBe(true);

      // Themes catalog intact
      expect(THEMES_CATALOG.length).toBeGreaterThan(3);

      // Currency functions intact
      setFluxBalance(750);
      expect(getFluxBalance()).toBe(750);
    });
  });
});
