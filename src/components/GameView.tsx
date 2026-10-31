import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import {
  createGame,
  type GameConfig,
  type GameHandle,
} from '@/game/create-game';
import type { GameEvent } from '@/game/types';

type GameViewProps = {
  config: GameConfig;
  onError: (message: string) => void;
  onEvent: (event: GameEvent) => void;
  initialCollectedCards: number[];
};

export type GameViewHandle = GameHandle;

export const GameView = forwardRef<GameViewHandle, GameViewProps>(
  function GameView({ config, onError, onEvent, initialCollectedCards }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const handleRef = useRef<GameHandle | null>(null);
    const callbacksRef = useRef({ onError, onEvent, initialCollectedCards });
    const initialConfigRef = useRef(config);

    useEffect(() => {
      callbacksRef.current = { onError, onEvent, initialCollectedCards };
    }, [onError, onEvent, initialCollectedCards]);

    useImperativeHandle(ref, () => {
      const proxy: GameHandle = {
        pause: () => handleRef.current?.pause(),
        resume: () => handleRef.current?.resume(),
        restart: () => handleRef.current?.restart(),
        updateConfig: next => handleRef.current?.updateConfig(next),
        dispose: () => handleRef.current?.dispose(),
        setLook: look => handleRef.current?.setLook(look),
        setPose: pose => handleRef.current?.setPose(pose),
        setActivity: kind => handleRef.current?.setActivity(kind),
        setActivityInput: value => handleRef.current?.setActivityInput(value),
        setPouring: on => handleRef.current?.setPouring(on),
        setPetAction: action => handleRef.current?.setPetAction(action),
        setPhotoCompanion: id => handleRef.current?.setPhotoCompanion(id),
        setPhotoGroup: (ids,pose,pair) => handleRef.current?.setPhotoGroup(ids,pose,pair),
        zoomCamera: delta => handleRef.current?.zoomCamera(delta),
        capturePhoto: () => handleRef.current?.capturePhoto() || null,
        setMove: (x, y) => handleRef.current?.setMove(x, y),
        rotateCamera: (dx, dy) => handleRef.current?.rotateCamera(dx, dy),
        jump: () => handleRef.current?.jump(),
        interact: () => handleRef.current?.interact(),
        setOutfit: id => handleRef.current?.setOutfit(id),
        setHair: id => handleRef.current?.setHair(id),
        setAccessory: id => handleRef.current?.setAccessory(id),
        setShoes: id => handleRef.current?.setShoes(id),
        setMoodLight: color => handleRef.current?.setMoodLight(color),
        setPresentation: mode => handleRef.current?.setPresentation(mode),
        setInputEnabled: enabled => handleRef.current?.setInputEnabled(enabled),
        setDancing: on => handleRef.current?.setDancing(on),
        setCollectedCards: ids => handleRef.current?.setCollectedCards(ids),
        celebrate: () => handleRef.current?.celebrate(),
      };
      return proxy;
    }, []);

    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      const handle = createGame(
        container,
        initialConfigRef.current,
        message => callbacksRef.current.onError(message),
        event => callbacksRef.current.onEvent(event)
      );
      handleRef.current = handle;
      handle.setCollectedCards(callbacksRef.current.initialCollectedCards);
      return () => {
        handle.dispose();
        handleRef.current = null;
      };
    }, []);

    useEffect(() => {
      handleRef.current?.updateConfig(config);
    }, [config]);

    return <div ref={containerRef} className="game-view" />;
  }
);