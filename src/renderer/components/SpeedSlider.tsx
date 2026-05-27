interface SpeedSliderProps {
  value: number
  onChange: (v: number) => void
}

export default function SpeedSlider({ value, onChange }: SpeedSliderProps) {
  const label = value < 20 ? 'Muy lento' : value < 40 ? 'Lento' : value < 60 ? 'Natural' : value < 80 ? 'Rápido' : 'Muy rápido'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Velocidad
        </span>
        <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
          {label}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, color: 'var(--text-ghost)', fontFamily: 'var(--font-mono)' }}>
          Humano
        </span>
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ flex: 1 }}
        />
        <span style={{ fontSize: 10, color: 'var(--text-ghost)', fontFamily: 'var(--font-mono)' }}>
          Robot
        </span>
      </div>
    </div>
  )
}
