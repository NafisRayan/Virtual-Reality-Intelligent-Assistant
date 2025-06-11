/**
 * Entity Component System Components
 */
import { Component, TagComponent, Types } from 'three/addons/libs/ecsy.module.js';

export class Object3D extends Component { }

Object3D.schema = {
    object: { type: Types.Ref }
};

export class Button extends Component { }

Button.schema = {
    // button states: [none, hovered, pressed]
    currState: { type: Types.String, default: 'none' },
    prevState: { type: Types.String, default: 'none' },
    action: { type: Types.Ref, default: () => { } }
};

export class Draggable extends Component { }

Draggable.schema = {
    // draggable states: [detached, hovered, to-be-attached, attached, to-be-detached]
    state: { type: Types.String, default: 'none' },
    originalParent: { type: Types.Ref, default: null },
    attachedPointer: { type: Types.Ref, default: null }
};

export class Intersectable extends TagComponent { }

export class HandsInstructionText extends TagComponent { }

export class OffsetFromCamera extends Component { }

OffsetFromCamera.schema = {
    x: { type: Types.Number, default: 0 },
    y: { type: Types.Number, default: 0 },
    z: { type: Types.Number, default: 0 },
};

export class NeedCalibration extends TagComponent { }

export class Randomizable extends TagComponent { }
