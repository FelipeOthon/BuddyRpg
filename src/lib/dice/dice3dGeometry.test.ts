import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  computeTargetDieQuaternion,
  type FaceOrientation,
} from "./dice3dGeometry";

describe("computeTargetDieQuaternion", () => {
  it("rotates any face normal upward toward +Z and keeps right-handed basis", () => {
    const faceMap = new Map<number, FaceOrientation>([
      [
        20,
        {
          normal: new THREE.Vector3(0.4, -0.7, 0.5916).normalize(),
          upTangent: new THREE.Vector3(0.2, 0.8, 0.5).normalize(),
        },
      ],
      [
        6,
        {
          normal: new THREE.Vector3(0, 0, -1),
          upTangent: new THREE.Vector3(0, 1, 0),
        },
      ],
    ]);

    for (const [val, orient] of faceMap.entries()) {
      const q = computeTargetDieQuaternion(faceMap, val);
      const rotatedNormal = orient.normal.clone().applyQuaternion(q);
      expect(rotatedNormal.x).toBeCloseTo(0, 4);
      expect(rotatedNormal.y).toBeCloseTo(0, 4);
      expect(rotatedNormal.z).toBeCloseTo(1, 4);
    }

    const qYaw = computeTargetDieQuaternion(faceMap, 6, Math.PI / 4);
    const rotatedWithYaw = faceMap
      .get(6)!
      .normal.clone()
      .applyQuaternion(qYaw);
    expect(rotatedWithYaw.z).toBeCloseTo(1, 4);
  });
});
