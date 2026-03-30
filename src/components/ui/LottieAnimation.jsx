'use client';

import { useRef, useEffect } from 'react';
import Lottie from 'lottie-react';
import { cn } from '@/lib/utils';

export function LottieAnimation({
  animationData,
  loop = false,
  autoplay = true,
  className,
  onComplete,
  ...props
}) {
  const lottieRef = useRef(null);

  useEffect(() => {
    if (onComplete && lottieRef.current) {
      lottieRef.current.addEventListener('complete', onComplete);
      return () => {
        lottieRef.current?.removeEventListener('complete', onComplete);
      };
    }
  }, [onComplete]);

  return (
    <Lottie
      lottieRef={lottieRef}
      animationData={animationData}
      loop={loop}
      autoplay={autoplay}
      className={cn('pointer-events-none', className)}
      {...props}
    />
  );
}

export function LottieSuccess({ className, size = 48, ...props }) {
  return (
    <LottieAnimation
      animationData={checkmarkAnimation}
      loop={false}
      className={className}
      style={{ width: size, height: size }}
      {...props}
    />
  );
}

export function LottieLoader({ className, size = 32, ...props }) {
  return (
    <LottieAnimation
      animationData={loaderAnimation}
      loop={true}
      className={className}
      style={{ width: size, height: size }}
      {...props}
    />
  );
}

const checkmarkAnimation = {
  v: '5.7.4',
  fr: 30,
  ip: 0,
  op: 40,
  w: 120,
  h: 120,
  nm: 'checkmark',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'check',
      sr: 1,
      ks: { o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [60, 60, 0] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] } },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              ind: 0,
              ty: 'sh',
              ks: {
                a: 0,
                k: {
                  i: [[0, 0], [0, 0], [0, 0]],
                  o: [[0, 0], [0, 0], [0, 0]],
                  v: [[-18, 2], [-6, 14], [20, -14]],
                  c: false,
                },
              },
            },
            {
              ty: 'tm',
              s: { a: 0, k: 0 },
              e: { a: 1, k: [{ i: { x: [0.2], y: [1] }, o: { x: [0.7], y: [0] }, t: 10, s: [0] }, { t: 30, s: [100] }] },
              o: { a: 0, k: 0 },
            },
            { ty: 'st', c: { a: 0, k: [0.925, 0.675, 0, 1] }, o: { a: 0, k: 100 }, w: { a: 0, k: 4.5 }, lc: 2, lj: 2 },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'checkmark',
        },
      ],
      ip: 0,
      op: 40,
      st: 0,
    },
    {
      ddd: 0,
      ind: 2,
      ty: 4,
      nm: 'circle',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 0, k: 0 },
        p: { a: 0, k: [60, 60, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ i: { x: [0.2, 0.2, 0.2], y: [1, 1, 1] }, o: { x: [0.7, 0.7, 0.7], y: [0, 0, 0] }, t: 0, s: [0, 0, 100] }, { t: 18, s: [100, 100, 100] }] },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            { ty: 'el', d: 1, s: { a: 0, k: [72, 72] }, p: { a: 0, k: [0, 0] } },
            { ty: 'st', c: { a: 0, k: [0.925, 0.675, 0, 0.25] }, o: { a: 0, k: 100 }, w: { a: 0, k: 2 } },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'ring',
        },
      ],
      ip: 0,
      op: 40,
      st: 0,
    },
  ],
};

const loaderAnimation = {
  v: '5.7.4',
  fr: 60,
  ip: 0,
  op: 60,
  w: 80,
  h: 80,
  nm: 'loader',
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: 'spinner',
      sr: 1,
      ks: {
        o: { a: 0, k: 100 },
        r: { a: 1, k: [{ i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] }, t: 0, s: [0] }, { t: 60, s: [360] }] },
        p: { a: 0, k: [40, 40, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 0, k: [100, 100, 100] },
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            { ty: 'el', d: 1, s: { a: 0, k: [48, 48] }, p: { a: 0, k: [0, 0] } },
            {
              ty: 'tm',
              s: { a: 0, k: 0 },
              e: { a: 0, k: 28 },
              o: { a: 0, k: 0 },
            },
            { ty: 'st', c: { a: 0, k: [0.925, 0.675, 0, 1] }, o: { a: 0, k: 80 }, w: { a: 0, k: 3 }, lc: 2 },
            { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } },
          ],
          nm: 'arc',
        },
      ],
      ip: 0,
      op: 60,
      st: 0,
    },
  ],
};
