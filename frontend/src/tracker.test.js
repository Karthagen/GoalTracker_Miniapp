import test from "node:test";
import assert from "node:assert/strict";
import {
  dateKey,
  shiftDay,
  daysBetween,
  normalizeGoal,
  toggleDay,
  dayProgress,
  statistics,
  activeSubs,
  migrateSingleGoal,
  saveSingleGoal,
} from "./tracker.js";

const today = "2026-11-15";

test("migration keeps exactly one active goal and preserves older goals in the export archive", () => {
  const stored = {
    goals: [
      { id: "first", mainGoal: "First", subgoals: [] },
      { id: "chosen", mainGoal: "Chosen", subgoals: [] },
    ],
    selectedGoalId: "chosen",
    lang: "ru",
  };
  const migrated = migrateSingleGoal(stored, today);
  assert.equal(migrated.goal.id, "chosen");
  assert.deepEqual(migrated.archivedGoals, [stored.goals[0]]);
  assert.equal(Object.hasOwn(migrated, "goals"), false);
  const reloaded = migrateSingleGoal(migrated, today);
  assert.equal(reloaded.goal.id, "chosen");
  assert.equal(reloaded.archivedGoals.length, 1);
});

test("saving never creates a second active goal and preserves the daily history", () => {
  const existing = {
    id: "one",
    mainGoal: "First",
    createdAt: "2026-11-01",
    history: { "2026-11-14": ["a"] },
    subgoals: [],
  };
  const state = { goal: existing, archivedGoals: [] };
  const saved = saveSingleGoal(state, {
    id: "new",
    mainGoal: "Edited",
    history: {},
    subgoals: [],
  });
  assert.equal(saved.goal.id, "one");
  assert.equal(saved.goal.mainGoal, "Edited");
  assert.equal(saved.goal.createdAt, "2026-11-01");
  assert.deepEqual(saved.goal.history, existing.history);
  assert.equal(saved.goal.icon, undefined);
  assert.equal(Object.hasOwn(saved, "goals"), false);
});

test("only daily steps have independently selected icons", () => {
  const goal = normalizeGoal(
    {
      id: "icons",
      mainGoal: "Create",
      icon: "palette",
      subgoals: [
        { id: "step", label: "Draw", icon: "camera" },
        { id: "run", label: "Run", icon: "walk" },
      ],
    },
    today,
  );
  assert.equal(goal.icon, undefined);
  assert.deepEqual(goal.subgoals.map((step) => step.icon), ["camera", "walk"]);
});

test("an empty single-goal state does not restore an archived goal", () => {
  const state = migrateSingleGoal(
    { goal: null, archivedGoals: [{ id: "old" }] },
    today,
  );
  assert.equal(state.goal, null);
  assert.equal(state.archivedGoals.length, 1);
});
const makeGoal = () =>
  normalizeGoal(
    {
      id: "1",
      mainGoal: "Learn",
      createdAt: "2026-11-01",
      subgoals: [
        { id: 1, label: "Read" },
        { id: 2, label: "Practice" },
      ],
    },
    today,
  );

test("dates follow the local calendar and cross month, year and DST boundaries", () => {
  assert.equal(dateKey(new Date(2026, 10, 15, 0, 1)), today);
  assert.equal(shiftDay("2026-12-31", 1), "2027-01-01");
  assert.equal(shiftDay("2024-03-01", -1), "2024-02-29");
  assert.equal(daysBetween("2026-10-31", "2026-11-02"), 2);
});
test("legacy checked items migrate to today and never count toward tomorrow", () => {
  const goal = normalizeGoal(
    {
      id: "1",
      mainGoal: "Test",
      subgoals: [
        { id: 1, label: "Read", completed: true },
        { id: 2, label: "Practice" },
      ],
    },
    today,
  );
  assert.deepEqual(goal.history[today], ["1"]);
  assert.equal(dayProgress(goal, today).percent, 50);
  assert.equal(dayProgress(goal, shiftDay(today, 1)).percent, 0);
});
test("check-ins are reversible, unique and isolated by date", () => {
  let goal = toggleDay(makeGoal(), today, "1");
  goal = toggleDay(goal, "2026-11-14", "2");
  assert.equal(dayProgress(goal, today).done, 1);
  assert.equal(dayProgress(goal, "2026-11-14").done, 1);
  goal = toggleDay(goal, today, "1");
  assert.equal(dayProgress(goal, today).done, 0);
  assert.equal(dayProgress(goal, "2026-11-14").done, 1);
});
test("streak tolerates unfinished today but breaks on a missed past day", () => {
  const goal = makeGoal();
  goal.history["2026-11-13"] = ["1", "2"];
  goal.history["2026-11-14"] = ["1", "2"];
  assert.equal(statistics(goal, today).streak, 2);
  goal.history[today] = ["1", "2"];
  assert.equal(statistics(goal, today).streak, 3);
  goal.history["2026-11-14"] = ["1"];
  assert.equal(statistics(goal, today).streak, 1);
});
test("adding and retiring habits leaves past denominators intact", () => {
  const goal = makeGoal();
  goal.subgoals[0].archivedAt = today;
  goal.subgoals.push({ id: "3", label: "New habit", createdAt: today });
  goal.history["2026-11-14"] = ["1", "2"];
  assert.equal(dayProgress(goal, "2026-11-14").percent, 100);
  assert.deepEqual(
    activeSubs(goal, today).map((s) => s.id),
    ["2", "3"],
  );
  assert.equal(dayProgress(goal, today).total, 2);
});
test("statistics exclude days before the goal existed and change with the period", () => {
  const goal = makeGoal();
  goal.history[today] = ["1", "2"];
  assert.deepEqual(dayProgress(goal, "2026-10-31"), {
    done: 0,
    total: 0,
    percent: 0,
  });
  assert.equal(statistics(goal, today, 7).consistency, 14);
  assert.equal(statistics(goal, today, 30).consistency, 7);
  assert.equal(statistics(goal, today, 30).perfect, 1);
});
