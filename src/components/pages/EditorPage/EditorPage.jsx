import useIsMobile from '../../../hooks/useIsMobile';
import EditorPageDesktop from './EditorPageDesktop';
import EditorPageMobile from './EditorPageMobile';

const EditorPage = () => {
  const isMobile = useIsMobile();
  return isMobile ? <EditorPageMobile /> : <EditorPageDesktop />;
};

export default EditorPage;
