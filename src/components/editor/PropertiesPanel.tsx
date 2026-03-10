import { useState } from 'react';
import Icon from '@/components/ui/icon';
import useEditorStore from '@/hooks/use-editor-store';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { getFontList, ensureFontLoaded } from '@/lib/google-fonts';

const PropertiesPanel = () => {
  const { tracks, selectedClipId, updateClip, removeClip, duplicateClip, splitClip, currentTime } = useEditorStore();
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const [fontSearch, setFontSearch] = useState('');

  const selectedClip = selectedClipId
    ? tracks.flatMap(t => t.clips).find(c => c.id === selectedClipId)
    : null;

  if (!selectedClip) {
    return (
      <div className="flex flex-col h-full editor-panel rounded-lg overflow-hidden">
        <div className="editor-panel-header px-3 py-1.5 flex items-center gap-2">
          <Icon name="Settings2" size={14} />
          <span className="text-xs font-medium">Свойства</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4">
          <Icon name="MousePointerClick" size={32} />
          <span className="text-xs mt-2 text-center">Выберите клип на таймлайне для редактирования</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full editor-panel rounded-lg overflow-hidden">
      <div className="editor-panel-header px-3 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="Settings2" size={14} />
          <span className="text-xs font-medium">Свойства</span>
        </div>
        <span className="text-[10px] text-muted-foreground capitalize">{selectedClip.type}</span>
      </div>

      <ScrollArea className="flex-1 editor-scrollbar">
        <div className="p-3 space-y-3">
          <div>
            <Label className="text-[10px] text-muted-foreground">Название</Label>
            <Input
              value={selectedClip.name}
              onChange={e => updateClip(selectedClip.id, { name: e.target.value })}
              className="h-7 text-xs mt-1 bg-secondary/50 border-border"
            />
          </div>

          <Separator className="bg-border/50" />

          <div className="space-y-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Позиция</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Начало (с)</Label>
                <Input
                  type="number"
                  value={selectedClip.startTime.toFixed(1)}
                  onChange={e => updateClip(selectedClip.id, { startTime: parseFloat(e.target.value) || 0 })}
                  className="h-7 text-xs mt-0.5 bg-secondary/50 border-border"
                  step="0.1"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Длительность (с)</Label>
                <Input
                  type="number"
                  value={selectedClip.duration.toFixed(1)}
                  onChange={e => updateClip(selectedClip.id, { duration: parseFloat(e.target.value) || 1 })}
                  className="h-7 text-xs mt-0.5 bg-secondary/50 border-border"
                  step="0.1"
                  min="0.1"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-border/50" />

          <div className="space-y-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Параметры</span>

            <div>
              <div className="flex justify-between">
                <Label className="text-[10px] text-muted-foreground">
                  {selectedClip.type === 'text' ? 'Прозрачность текста' : 'Прозрачность'}
                </Label>
                <span className="text-[10px] text-muted-foreground">{Math.round(selectedClip.opacity * 100)}%</span>
              </div>
              <Slider
                value={[selectedClip.opacity * 100]}
                onValueChange={([v]) => updateClip(selectedClip.id, { opacity: v / 100 })}
                max={100}
                step={1}
                className="mt-1"
              />
            </div>

            {(selectedClip.type === 'video' || selectedClip.type === 'audio') && (
              <div>
                <div className="flex justify-between">
                  <Label className="text-[10px] text-muted-foreground">Громкость</Label>
                  <span className="text-[10px] text-muted-foreground">{Math.round(selectedClip.volume * 100)}%</span>
                </div>
                <Slider
                  value={[selectedClip.volume * 100]}
                  onValueChange={([v]) => updateClip(selectedClip.id, { volume: v / 100 })}
                  max={200}
                  step={1}
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <div className="flex justify-between">
                <Label className="text-[10px] text-muted-foreground">Скорость</Label>
                <span className="text-[10px] text-muted-foreground">{selectedClip.speed.toFixed(1)}x</span>
              </div>
              <Slider
                value={[selectedClip.speed * 100]}
                onValueChange={([v]) => updateClip(selectedClip.id, { speed: v / 100 })}
                min={10}
                max={400}
                step={10}
                className="mt-1"
              />
            </div>
          </div>

          {(selectedClip.type === 'image' || selectedClip.type === 'video') && (
            <>
              <Separator className="bg-border/50" />
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Трансформация</span>
                  {((selectedClip.positionX ?? 50) !== 50 || (selectedClip.positionY ?? 50) !== 50 || (selectedClip.scale ?? 100) !== 100 || (selectedClip.rotation ?? 0) !== 0) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 px-1.5 text-[9px] text-muted-foreground hover:text-foreground"
                      onClick={() => updateClip(selectedClip.id, { positionX: 50, positionY: 50, scale: 100, rotation: 0 })}
                    >
                      <Icon name="RotateCcw" size={9} />
                      <span className="ml-1">Сброс</span>
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">X позиция</Label>
                    <Input
                      type="number"
                      value={selectedClip.positionX ?? 50}
                      onChange={e => updateClip(selectedClip.id, { positionX: parseFloat(e.target.value) || 0 })}
                      className="h-7 text-xs mt-0.5 bg-secondary/50 border-border"
                      step="1"
                      min="-100"
                      max="200"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Y позиция</Label>
                    <Input
                      type="number"
                      value={selectedClip.positionY ?? 50}
                      onChange={e => updateClip(selectedClip.id, { positionY: parseFloat(e.target.value) || 0 })}
                      className="h-7 text-xs mt-0.5 bg-secondary/50 border-border"
                      step="1"
                      min="-100"
                      max="200"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between">
                    <Label className="text-[10px] text-muted-foreground">Масштаб</Label>
                    <span className="text-[10px] text-muted-foreground">{selectedClip.scale ?? 100}%</span>
                  </div>
                  <Slider
                    value={[selectedClip.scale ?? 100]}
                    onValueChange={([v]) => updateClip(selectedClip.id, { scale: v })}
                    min={10}
                    max={300}
                    step={1}
                    className="mt-1"
                  />
                </div>

                <div>
                  <div className="flex justify-between">
                    <Label className="text-[10px] text-muted-foreground">Поворот</Label>
                    <span className="text-[10px] text-muted-foreground">{selectedClip.rotation ?? 0}°</span>
                  </div>
                  <Slider
                    value={[selectedClip.rotation ?? 0]}
                    onValueChange={([v]) => updateClip(selectedClip.id, { rotation: v })}
                    min={-180}
                    max={180}
                    step={1}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label className="text-[10px] text-muted-foreground">Режим заполнения</Label>
                  <div className="flex gap-1 mt-1">
                    {([['contain', 'Вписать'], ['cover', 'Заполнить'], ['fill', 'Растянуть']] as const).map(([mode, label]) => (
                      <button
                        key={mode}
                        onClick={() => updateClip(selectedClip.id, { fitMode: mode })}
                        className={`flex-1 py-1 text-[9px] rounded transition-colors ${
                          (selectedClip.fitMode || 'contain') === mode
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'bg-secondary/50 text-muted-foreground hover:bg-secondary border border-transparent'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {selectedClip.type === 'text' && (
            <>
              <Separator className="bg-border/50" />
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Текст</span>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Содержание</Label>
                  <Input
                    value={selectedClip.text || ''}
                    onChange={e => updateClip(selectedClip.id, { text: e.target.value })}
                    className="h-7 text-xs mt-0.5 bg-secondary/50 border-border"
                  />
                </div>

                <div className="relative">
                  <Label className="text-[10px] text-muted-foreground">Шрифт</Label>
                  <button
                    onClick={() => { setFontPickerOpen(!fontPickerOpen); setFontSearch(''); }}
                    className="w-full h-7 mt-0.5 px-2 text-xs text-left bg-secondary/50 border border-border rounded-md flex items-center justify-between hover:bg-secondary transition-colors"
                  >
                    <span style={{ fontFamily: ensureFontLoaded(selectedClip.fontFamily) }}>
                      {selectedClip.fontFamily || 'Sans-serif'}
                    </span>
                    <Icon name={fontPickerOpen ? 'ChevronUp' : 'ChevronDown'} size={10} className="text-muted-foreground" />
                  </button>
                  {fontPickerOpen && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden">
                      <div className="p-1.5 border-b border-border">
                        <Input
                          value={fontSearch}
                          onChange={e => setFontSearch(e.target.value)}
                          placeholder="Поиск шрифта..."
                          className="h-6 text-[10px] bg-secondary/50 border-border"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {getFontList()
                          .filter(f => !fontSearch || f.name.toLowerCase().includes(fontSearch.toLowerCase()))
                          .map(font => (
                            <button
                              key={font.family}
                              onClick={() => {
                                ensureFontLoaded(font.family);
                                updateClip(selectedClip.id, { fontFamily: font.google ? font.family : undefined });
                                setFontPickerOpen(false);
                              }}
                              onMouseEnter={() => { if (font.google) ensureFontLoaded(font.family); }}
                              className={`w-full text-left px-2 py-1.5 text-xs hover:bg-secondary transition-colors flex items-center justify-between ${
                                (selectedClip.fontFamily || 'sans-serif') === font.family ? 'bg-primary/10 text-primary' : ''
                              }`}
                            >
                              <span style={{ fontFamily: font.google ? `"${font.family}", sans-serif` : font.family }}>
                                {font.name}
                              </span>
                              {font.google && <span className="text-[8px] text-muted-foreground/50">G</span>}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Размер шрифта</Label>
                    <Input
                      type="number"
                      value={selectedClip.fontSize || 48}
                      onChange={e => updateClip(selectedClip.id, { fontSize: parseInt(e.target.value) || 48 })}
                      className="h-7 text-xs mt-0.5 bg-secondary/50 border-border"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Цвет текста</Label>
                    <Input
                      type="color"
                      value={selectedClip.fontColor || '#ffffff'}
                      onChange={e => updateClip(selectedClip.id, { fontColor: e.target.value })}
                      className="h-7 mt-0.5 p-0.5 bg-secondary/50 border-border cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[10px] text-muted-foreground">Жирность</Label>
                  <div className="flex gap-1 mt-1">
                    {([[400, 'Обычный'], [600, 'Полужирный'], [800, 'Жирный']] as const).map(([w, label]) => (
                      <button
                        key={w}
                        onClick={() => updateClip(selectedClip.id, { fontWeight: w })}
                        className={`flex-1 py-1 text-[9px] rounded transition-colors ${
                          (selectedClip.fontWeight || 600) === w
                            ? 'bg-primary/20 text-primary border border-primary/30'
                            : 'bg-secondary/50 text-muted-foreground hover:bg-secondary border border-transparent'
                        }`}
                        style={{ fontWeight: w }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Separator className="bg-border/50" />
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Оформление</span>

                <div>
                  <div className="flex justify-between">
                    <Label className="text-[10px] text-muted-foreground">Тень</Label>
                    <span className="text-[10px] text-muted-foreground">{selectedClip.textShadow ?? 8}px</span>
                  </div>
                  <Slider
                    value={[selectedClip.textShadow ?? 8]}
                    onValueChange={([v]) => updateClip(selectedClip.id, { textShadow: v })}
                    min={0}
                    max={30}
                    step={1}
                    className="mt-1"
                  />
                </div>

                <div>
                  <div className="flex justify-between">
                    <Label className="text-[10px] text-muted-foreground">Обводка</Label>
                    <span className="text-[10px] text-muted-foreground">{selectedClip.textStroke ?? 0}px</span>
                  </div>
                  <Slider
                    value={[selectedClip.textStroke ?? 0]}
                    onValueChange={([v]) => updateClip(selectedClip.id, { textStroke: v })}
                    min={0}
                    max={10}
                    step={1}
                    className="mt-1"
                  />
                </div>

                {(selectedClip.textStroke ?? 0) > 0 && (
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Цвет обводки</Label>
                    <Input
                      type="color"
                      value={selectedClip.textStrokeColor || '#000000'}
                      onChange={e => updateClip(selectedClip.id, { textStrokeColor: e.target.value })}
                      className="h-7 mt-0.5 p-0.5 bg-secondary/50 border-border cursor-pointer"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground">Фон под текстом</Label>
                  <button
                    onClick={() => updateClip(selectedClip.id, { textBg: !selectedClip.textBg })}
                    className={`w-8 h-4 rounded-full transition-colors ${selectedClip.textBg ? 'bg-primary' : 'bg-secondary'}`}
                  >
                    <div className={`w-3 h-3 rounded-full bg-white transition-transform ${selectedClip.textBg ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                {selectedClip.textBg && (
                  <div className="space-y-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Цвет фона</Label>
                      <Input
                        type="color"
                        value={selectedClip.textBgColor || '#000000'}
                        onChange={e => updateClip(selectedClip.id, { textBgColor: e.target.value })}
                        className="h-7 mt-0.5 p-0.5 bg-secondary/50 border-border cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between">
                        <Label className="text-[10px] text-muted-foreground">Прозрачность фона</Label>
                        <span className="text-[10px] text-muted-foreground">{Math.round((selectedClip.textBgOpacity ?? 0.6) * 100)}%</span>
                      </div>
                      <Slider
                        value={[(selectedClip.textBgOpacity ?? 0.6) * 100]}
                        onValueChange={([v]) => updateClip(selectedClip.id, { textBgOpacity: v / 100 })}
                        max={100}
                        step={1}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {selectedClip.filters && selectedClip.filters.length > 0 && (
            <>
              <Separator className="bg-border/50" />
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Эффекты</span>
                {selectedClip.filters.map((f, idx) => (
                  <div key={f.id || idx} className="flex items-center gap-2">
                    <span className="text-[10px] flex-1">{f.name}</span>
                    <Slider
                      value={[typeof f.params?.intensity === 'number' ? f.params.intensity : 50]}
                      onValueChange={([v]) => {
                        const newFilters = [...selectedClip.filters];
                        newFilters[idx] = { ...newFilters[idx], params: { ...newFilters[idx].params, intensity: v } };
                        updateClip(selectedClip.id, { filters: newFilters });
                      }}
                      max={100}
                      step={1}
                      className="w-20"
                    />
                    <button
                      onClick={() => {
                        updateClip(selectedClip.id, { filters: selectedClip.filters.filter((_, i) => i !== idx) });
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Icon name="X" size={10} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {selectedClip.transition && (
            <>
              <Separator className="bg-border/50" />
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Переход</span>
                <div className="flex items-center gap-2">
                  <Icon name="Sparkles" size={10} className="text-primary" />
                  <span className="text-[10px] flex-1 capitalize">{selectedClip.transition.type}</span>
                  <span className="text-[9px] text-muted-foreground">{selectedClip.transition.duration}с</span>
                  <button
                    onClick={() => updateClip(selectedClip.id, { transition: undefined })}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Icon name="X" size={10} />
                  </button>
                </div>
              </div>
            </>
          )}

          <Separator className="bg-border/50" />

          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Действия</span>
            <div className="grid grid-cols-2 gap-1">
              <button onClick={() => splitClip(selectedClip.id, currentTime)} className="nle-button flex items-center justify-center gap-1 py-1.5">
                <Icon name="Scissors" size={10} /> Разрезать
              </button>
              <button onClick={() => duplicateClip(selectedClip.id)} className="nle-button flex items-center justify-center gap-1 py-1.5">
                <Icon name="Copy" size={10} /> Копия
              </button>
              <button onClick={() => removeClip(selectedClip.id)} className="nle-button flex items-center justify-center gap-1 py-1.5 hover:bg-destructive/20 hover:text-destructive">
                <Icon name="Trash2" size={10} /> Удалить
              </button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default PropertiesPanel;