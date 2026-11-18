export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type DistanceRule = "chebyshev" | "euclidean" | "alternating";
export type CampaignRole = "gm" | "player";
export type GridType = "none" | "square" | "hex_pointy" | "hex_flat";
export type SceneElementLayer =
  | "prop"
  | "mount"
  | "drawing"
  | "text"
  | "attachment";
export type SceneElementKind =
  | "freehand"
  | "line"
  | "rect"
  | "circle"
  | "cone"
  | "polygon"
  | "text"
  | "image"
  | "aura";
export type FogMode = "static" | "dynamic" | "hybrid";
export type FogOperation = "cover" | "reveal";
export type FogShapeKind = "rect" | "circle" | "polygon";
export type WeatherPreset =
  | "none"
  | "rain"
  | "snow"
  | "fog_mist"
  | "embers"
  | "ash";
export type WallType = "wall" | "door" | "window";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      campaigns: {
        Row: {
          id: string;
          title: string;
          gm_id: string;
          invite_code: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          gm_id: string;
          invite_code?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          gm_id?: string;
          invite_code?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaigns_gm_id_fkey";
            columns: ["gm_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      campaign_members: {
        Row: {
          campaign_id: string;
          user_id: string;
          role: CampaignRole;
          joined_at: string;
        };
        Insert: {
          campaign_id: string;
          user_id: string;
          role: CampaignRole;
          joined_at?: string;
        };
        Update: {
          campaign_id?: string;
          user_id?: string;
          role?: CampaignRole;
          joined_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_members_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "campaign_members_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      campaign_tracks: {
        Row: {
          id: string;
          campaign_id: string;
          title: string;
          url: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          title: string;
          url: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          title?: string;
          url?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "campaign_tracks_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      scenes: {
        Row: {
          id: string;
          campaign_id: string;
          name: string;
          map_url: string | null;
          map_width: number;
          map_height: number;
          grid_size: number;
          grid_opacity: number;
          grid_type: GridType;
          grid_offset_x: number;
          grid_offset_y: number;
          snap_to_grid: boolean;
          meters_per_cell: number;
          distance_rule: DistanceRule;
          is_active: boolean;
          is_player_visible: boolean;
          combat_state: Json | null;
          fog_enabled: boolean;
          fog_mode: FogMode;
          fog_color: string;
          ambient_light: number;
          weather_preset: WeatherPreset;
          weather_intensity: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          name: string;
          map_url?: string | null;
          map_width?: number;
          map_height?: number;
          grid_size?: number;
          grid_opacity?: number;
          grid_type?: GridType;
          grid_offset_x?: number;
          grid_offset_y?: number;
          snap_to_grid?: boolean;
          meters_per_cell?: number;
          distance_rule?: DistanceRule;
          is_active?: boolean;
          is_player_visible?: boolean;
          combat_state?: Json | null;
          fog_enabled?: boolean;
          fog_mode?: FogMode;
          fog_color?: string;
          ambient_light?: number;
          weather_preset?: WeatherPreset;
          weather_intensity?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          name?: string;
          map_url?: string | null;
          map_width?: number;
          map_height?: number;
          grid_size?: number;
          grid_opacity?: number;
          grid_type?: GridType;
          grid_offset_x?: number;
          grid_offset_y?: number;
          snap_to_grid?: boolean;
          meters_per_cell?: number;
          distance_rule?: DistanceRule;
          is_active?: boolean;
          is_player_visible?: boolean;
          combat_state?: Json | null;
          fog_enabled?: boolean;
          fog_mode?: FogMode;
          fog_color?: string;
          ambient_light?: number;
          weather_preset?: WeatherPreset;
          weather_intensity?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scenes_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      scene_fog_shapes: {
        Row: {
          id: string;
          scene_id: string;
          campaign_id: string;
          operation: FogOperation;
          shape_kind: FogShapeKind;
          data: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          scene_id: string;
          campaign_id: string;
          operation: FogOperation;
          shape_kind: FogShapeKind;
          data?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          scene_id?: string;
          campaign_id?: string;
          operation?: FogOperation;
          shape_kind?: FogShapeKind;
          data?: Json;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scene_fog_shapes_scene_id_fkey";
            columns: ["scene_id"];
            isOneToOne: false;
            referencedRelation: "scenes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scene_fog_shapes_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      scene_walls: {
        Row: {
          id: string;
          scene_id: string;
          campaign_id: string;
          x1: number;
          y1: number;
          x2: number;
          y2: number;
          wall_type: WallType;
          is_open: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          scene_id: string;
          campaign_id: string;
          x1: number;
          y1: number;
          x2: number;
          y2: number;
          wall_type?: WallType;
          is_open?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          scene_id?: string;
          campaign_id?: string;
          x1?: number;
          y1?: number;
          x2?: number;
          y2?: number;
          wall_type?: WallType;
          is_open?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scene_walls_scene_id_fkey";
            columns: ["scene_id"];
            isOneToOne: false;
            referencedRelation: "scenes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scene_walls_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
        ];
      };
      scene_elements: {
        Row: {
          id: string;
          scene_id: string;
          campaign_id: string;
          created_by: string | null;
          layer: SceneElementLayer;
          kind: SceneElementKind;
          attached_to_token_id: string | null;
          x: number;
          y: number;
          rotation: number;
          data: Json;
          is_locked: boolean;
          is_hidden: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          scene_id: string;
          campaign_id: string;
          created_by?: string | null;
          layer?: SceneElementLayer;
          kind: SceneElementKind;
          attached_to_token_id?: string | null;
          x?: number;
          y?: number;
          rotation?: number;
          data?: Json;
          is_locked?: boolean;
          is_hidden?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          scene_id?: string;
          campaign_id?: string;
          created_by?: string | null;
          layer?: SceneElementLayer;
          kind?: SceneElementKind;
          attached_to_token_id?: string | null;
          x?: number;
          y?: number;
          rotation?: number;
          data?: Json;
          is_locked?: boolean;
          is_hidden?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scene_elements_scene_id_fkey";
            columns: ["scene_id"];
            isOneToOne: false;
            referencedRelation: "scenes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scene_elements_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "scene_elements_attached_to_token_id_fkey";
            columns: ["attached_to_token_id"];
            isOneToOne: false;
            referencedRelation: "tokens";
            referencedColumns: ["id"];
          },
        ];
      };
      characters: {
        Row: {
          id: string;
          campaign_id: string;
          owner_id: string | null;
          name: string;
          sheet_data: Json;
          player_can_edit: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          owner_id?: string | null;
          name: string;
          sheet_data?: Json;
          player_can_edit?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          owner_id?: string | null;
          name?: string;
          sheet_data?: Json;
          player_can_edit?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "characters_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "characters_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tokens: {
        Row: {
          id: string;
          scene_id: string;
          campaign_id: string;
          owner_id: string | null;
          character_id: string | null;
          name: string;
          image_url: string | null;
          pos_x: number;
          pos_y: number;
          size: number;
          hp_current: number;
          hp_max: number;
          is_hidden: boolean;
          conditions: string[];
          ring_color: string | null;
          is_locked: boolean;
          vision_range: number;
          light_radius: number;
          light_color: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          scene_id: string;
          campaign_id?: string;
          owner_id?: string | null;
          character_id?: string | null;
          name: string;
          image_url?: string | null;
          pos_x?: number;
          pos_y?: number;
          size?: number;
          hp_current?: number;
          hp_max?: number;
          is_hidden?: boolean;
          conditions?: string[];
          ring_color?: string | null;
          is_locked?: boolean;
          vision_range?: number;
          light_radius?: number;
          light_color?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          scene_id?: string;
          campaign_id?: string;
          owner_id?: string | null;
          character_id?: string | null;
          name?: string;
          image_url?: string | null;
          pos_x?: number;
          pos_y?: number;
          size?: number;
          hp_current?: number;
          hp_max?: number;
          is_hidden?: boolean;
          conditions?: string[];
          ring_color?: string | null;
          is_locked?: boolean;
          vision_range?: number;
          light_radius?: number;
          light_color?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tokens_scene_id_fkey";
            columns: ["scene_id"];
            isOneToOne: false;
            referencedRelation: "scenes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tokens_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tokens_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tokens_character_id_fkey";
            columns: ["character_id"];
            isOneToOne: false;
            referencedRelation: "characters";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          id: number;
          campaign_id: string;
          user_id: string | null;
          content: string;
          roll_result: Json | null;
          created_at: string;
        };
        Insert: {
          id?: never;
          campaign_id: string;
          user_id?: string | null;
          content: string;
          roll_result?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: never;
          campaign_id?: string;
          user_id?: string | null;
          content?: string;
          roll_result?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_campaign_id_fkey";
            columns: ["campaign_id"];
            isOneToOne: false;
            referencedRelation: "campaigns";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_campaign_member: {
        Args: { cid: string };
        Returns: boolean;
      };
      is_campaign_gm: {
        Args: { cid: string };
        Returns: boolean;
      };
      join_campaign: {
        Args: { code: string };
        Returns: string;
      };
      set_active_scene: {
        Args: { target_scene_id: string };
        Returns: undefined;
      };
      set_scene_player_visibility: {
        Args: { target_scene_id: string; visible: boolean };
        Returns: undefined;
      };
      set_character_edit_lock: {
        Args: { target_character_id: string; can_edit: boolean };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
