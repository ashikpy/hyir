'use client'

import React from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  LabelList
} from 'recharts'

interface TimelineData {
  date: string
  count: number
}

interface FunnelData {
  name: string
  value: number
  fill: string
}

export function ApplicationTimelineChart({ data }: { data: TimelineData[] }) {
  if (data.length === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center border border-zinc-900 rounded-lg bg-zinc-950/30">
        <span className="text-zinc-600 text-sm">Not enough data to show timeline.</span>
      </div>
    )
  }

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#52525b" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            dy={10}
          />
          <YAxis 
            stroke="#52525b" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value) => Math.floor(value) === value ? value.toString() : ''}
          />
          <Tooltip 
            cursor={{ fill: '#27272a', opacity: 0.4 }}
            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
            itemStyle={{ color: '#e4e4e7' }}
          />
          <Bar dataKey="count" fill="#ffffff" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ApplicationFunnelChart({ data }: { data: FunnelData[] }) {
  if (data.length === 0 || data[0].value === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center border border-zinc-900 rounded-lg bg-zinc-950/30">
        <span className="text-zinc-600 text-sm">Not enough data to show funnel.</span>
      </div>
    )
  }

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <FunnelChart>
          <Tooltip 
            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px' }}
            itemStyle={{ color: '#e4e4e7' }}
          />
          <Funnel
            dataKey="value"
            data={data}
            isAnimationActive
          >
            <LabelList position="right" fill="#a1a1aa" stroke="none" dataKey="name" fontSize={12} />
            <LabelList position="center" fill="#000" stroke="none" dataKey="value" fontSize={14} fontWeight="bold" />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  )
}
